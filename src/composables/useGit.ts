import git, { Errors } from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import LightningFS from '@isomorphic-git/lightning-fs'
import { reactive, ref } from 'vue'
import { ensureBrowserStorage, withStorageErrors } from '@/lib/browserStorage'
import { errorMessage, reportError } from '@/lib/errors'
import { confirmDialog } from '@/composables/useConfirmDialog'
import { isMissingGitObjectError } from '@/lib/gitRecovery'
import { notesMergeDriver } from '@/lib/notesMergeDriver'
import { corsProxyForRepo, loadCorsProxySetting } from '@/lib/gitCorsProxy'
import {
  resolveMoveNotePath,
  resolveNewNoteFilename,
  type ResolveNewNoteOptions,
} from '@/lib/noteFilenames'
import { isNoteFile, isPdfFile } from '@/lib/fileTypes'
import {
  CLONED_AT_KEY_PREFIX,
  collectGitNoteMtimes,
  GIT_MTIMES_SESSION_PREFIX,
  resolveRecentLastModified,
} from '@/lib/recentNoteMtimes'

export class RepositoryRepairCancelledError extends Error {
  constructor() {
    super(
      'Repository repair was cancelled. Unsynced changes may remain — try syncing again or reset the app in settings.',
    )
    this.name = 'RepositoryRepairCancelledError'
  }
}

export type GitSettings = {
  repoUrl: string
  token: string
  corsProxy: string
  author: { name: string; email: string }
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

export type RecentNote = {
  filepath: string
  lastModified: number
}

const REPO_DIR = '/repo'
const FS_NAME = 'git-notes-fs'
/** Shallow clone on first setup. */
const INITIAL_CLONE_DEPTH = 10
/** Fetch / re-clone depth when local objects are missing (merge, push, amend, etc.). */
const RECOVERY_HISTORY_DEPTH = 30
/** Amend the previous commit when a new persist falls within this window. */
export const COMMIT_AMEND_WINDOW_MS = 60_000
const LAST_PUSHED_OID_KEY = 'lastPushedCommitOid'

const fs = new LightningFS(FS_NAME)
const pfs = fs.promises

function loadSettings(): GitSettings {
  return {
    repoUrl: localStorage.getItem('repoUrl') ?? '',
    token: localStorage.getItem('token') ?? '',
    corsProxy: loadCorsProxySetting(localStorage.getItem('corsProxy')),
    author: {
      name: localStorage.getItem('authorName') ?? 'Notes',
      email: localStorage.getItem('authorEmail') ?? 'notes@local',
    },
  }
}

function saveSettings(settings: GitSettings) {
  localStorage.setItem('repoUrl', settings.repoUrl)
  localStorage.setItem('token', settings.token)
  localStorage.setItem('corsProxy', settings.corsProxy)
  localStorage.setItem('authorName', settings.author.name)
  localStorage.setItem('authorEmail', settings.author.email)
}

function defaultSettings(): GitSettings {
  return {
    repoUrl: '',
    token: '',
    corsProxy: '/git-cors',
    author: { name: '', email: '' },
  }
}

function clearStoredSettings() {
  const pushedPrefix = `${LAST_PUSHED_OID_KEY}:`
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (
      key === 'repoUrl' ||
      key === 'token' ||
      key === 'corsProxy' ||
      key === 'authorName' ||
      key === 'authorEmail' ||
      key.startsWith(pushedPrefix) ||
      key.startsWith(CLONED_AT_KEY_PREFIX)
    ) {
      keys.push(key)
    }
  }
  for (const key of keys) localStorage.removeItem(key)

  const sessionKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(GIT_MTIMES_SESSION_PREFIX)) sessionKeys.push(key)
  }
  for (const key of sessionKeys) sessionStorage.removeItem(key)
}

/** Wipe the LightningFS IndexedDB store. Required for reset — recursive delete only updates in-memory metadata and may not persist before reload. */
async function wipeFilesystem(): Promise<void> {
  await pfs.init(FS_NAME, { wipe: true })
}

function basicAuthHeader(token: string) {
  return `Basic ${btoa(`x-access-token:${token}`)}`
}

function authHeaders(settings: GitSettings): Record<string, string> {
  const token = settings.token.trim()
  if (!token) return {}
  return { Authorization: basicAuthHeader(token) }
}

function auth(settings: GitSettings) {
  return () => {
    const token = settings.token.trim()
    if (!token) {
      throw new Error('Personal access token is required')
    }
    return { username: 'x-access-token', password: token }
  }
}

function isPushNotFastForward(err: unknown): boolean {
  return err instanceof Errors.PushRejectedError && err.data.reason === 'not-fast-forward'
}

function remoteGitOptions(gitSettings: GitSettings, repoUrl = gitSettings.repoUrl.trim()) {
  return {
    fs,
    http,
    dir: REPO_DIR,
    corsProxy: corsProxyForRepo(gitSettings.corsProxy, repoUrl),
    headers: authHeaders(gitSettings),
    onAuth: auth(gitSettings),
    singleBranch: true as const,
  }
}

async function ensureParentDirs(filepath: string): Promise<void> {
  const slash = filepath.lastIndexOf('/')
  if (slash === -1) return

  const parts = filepath.slice(0, slash).split('/')
  let dir = REPO_DIR
  for (const part of parts) {
    dir = `${dir}/${part}`
    try {
      await pfs.mkdir(dir)
    } catch {
      // Directory already exists
    }
  }
}

async function collectNoteFiles(dir: string, prefix: string): Promise<string[]> {
  const entries = await pfs.readdir(dir)
  const files: string[] = []

  for (const name of entries) {
    if (name.startsWith('.')) continue
    const fullPath = `${dir}/${name}`
    const stat = await pfs.stat(fullPath)
    if (stat.isDirectory()) {
      const nested = await collectNoteFiles(fullPath, prefix ? `${prefix}/${name}` : name)
      files.push(...nested)
      continue
    }
    if (!isNoteFile(name)) continue
    files.push(prefix ? `${prefix}/${name}` : name)
  }

  return files
}

async function repoExists(): Promise<boolean> {
  try {
    await pfs.stat(`${REPO_DIR}/.git`)
    return true
  } catch {
    return false
  }
}

const afterCommitListeners = new Set<(filepath: string) => void | Promise<void>>()

async function notifyAfterCommit(filepath: string) {
  await Promise.all([...afterCommitListeners].map((listener) => listener(filepath)))
}

const settings = reactive(loadSettings())
const isCloned = ref(false)
const syncStatus = ref<SyncStatus>('idle')
const lastError = ref<string | null>(null)
const isBusy = ref(false)
const hasUnpushedCommits = ref(false)

let gitLock: Promise<void> = Promise.resolve()

function withGitLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = gitLock.then(fn)
  gitLock = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

let lastLocalCommitAt: number | null = null
let lastPushedCommitOid: string | null = null

function pushedOidStorageKey(): string {
  return `${LAST_PUSHED_OID_KEY}:${settings.repoUrl.trim()}`
}

function clonedAtStorageKey(): string {
  return `${CLONED_AT_KEY_PREFIX}${settings.repoUrl.trim()}`
}

function gitMtimesSessionKey(): string {
  return `${GIT_MTIMES_SESSION_PREFIX}${settings.repoUrl.trim()}`
}

function loadClonedAt(): number | null {
  const raw = localStorage.getItem(clonedAtStorageKey())
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function saveClonedAt(at: number) {
  localStorage.setItem(clonedAtStorageKey(), String(at))
}

function loadSessionGitMtimes(): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem(gitMtimesSessionKey())
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, number>
  } catch {
    return null
  }
}

async function ensureSessionGitMtimes(cache: object = {}): Promise<Record<string, number>> {
  const existing = loadSessionGitMtimes()
  if (existing) return existing
  if (!loadClonedAt()) return {}

  const times = await collectGitNoteMtimes({
    fs,
    dir: REPO_DIR,
    cache,
    depth: INITIAL_CLONE_DEPTH,
  })
  sessionStorage.setItem(gitMtimesSessionKey(), JSON.stringify(times))
  return times
}

function saveLastPushedCommitOid(oid: string) {
  lastPushedCommitOid = oid
  const repoUrl = settings.repoUrl.trim()
  if (repoUrl) localStorage.setItem(pushedOidStorageKey(), oid)
}

async function resolveHeadOid(): Promise<string> {
  return git.resolveRef({ fs, dir: REPO_DIR, ref: 'HEAD' })
}

async function deepenShallowHistory(): Promise<void> {
  await git.fetch({
    ...remoteGitOptions(settings),
    depth: RECOVERY_HISTORY_DEPTH,
  })
}

async function confirmRecloneForRecovery(): Promise<void> {
  const confirmed = await confirmDialog({
    title: 'Re-download repository?',
    description:
      'Local Git data is damaged or incomplete and could not be repaired by fetching more history. Nomagi can delete the copy in this browser and download it again from the remote. Unsynced commits in this browser will be lost. Your remote repository is not changed.',
    confirmLabel: 'Re-download',
  })
  if (!confirmed) throw new RepositoryRepairCancelledError()
}

async function recloneWithRecoveryDepth(): Promise<void> {
  const repoUrl = settings.repoUrl.trim()
  if (!repoUrl) throw new Error('Repository URL is required')
  if (!settings.token.trim()) throw new Error('Personal access token is required')

  await confirmRecloneForRecovery()

  await withStorageErrors(async () => {
    await wipeFilesystem()
  })
  await git.clone({
    ...remoteGitOptions(settings),
    url: repoUrl,
    depth: RECOVERY_HISTORY_DEPTH,
  })
  isCloned.value = true
  const head = await resolveHeadOid()
  saveLastPushedCommitOid(head)
  saveClonedAt(Date.now())
  sessionStorage.removeItem(gitMtimesSessionKey())
  await ensureSessionGitMtimes()
}

async function withMissingObjectRecovery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isMissingGitObjectError(err)) throw err
    const missingOid = err.data.what
    reportError('git missing object', err)
    console.warn('[git] missing object, fetching deeper history:', missingOid)

    await deepenShallowHistory()
    try {
      return await fn()
    } catch (retryErr) {
      if (!isMissingGitObjectError(retryErr)) throw retryErr
      console.warn('[git] still missing objects, re-cloning with depth', RECOVERY_HISTORY_DEPTH)
      await recloneWithRecoveryDepth()
      return await fn()
    }
  }
}

async function refreshCommitState(cache: object = {}) {
  try {
    await withMissingObjectRecovery(async () => {
      const head = await resolveHeadOid()
      lastPushedCommitOid = localStorage.getItem(pushedOidStorageKey()) ?? head
      hasUnpushedCommits.value = head !== lastPushedCommitOid

      const commits = await git.log({ fs, dir: REPO_DIR, depth: 1, cache })
      lastLocalCommitAt = commits.length > 0 ? commits[0].commit.committer.timestamp * 1000 : null
    })
  } catch {
    lastLocalCommitAt = null
    hasUnpushedCommits.value = false
  }
}

async function shouldAmendCommit(): Promise<boolean> {
  if (!lastLocalCommitAt) return false
  if (Date.now() - lastLocalCommitAt > COMMIT_AMEND_WINDOW_MS) return false

  try {
    const head = await resolveHeadOid()
    return head !== lastPushedCommitOid
  } catch {
    return false
  }
}

export function useGit() {
  async function setupBrowserStorage() {
    return ensureBrowserStorage()
  }

  async function checkCloned() {
    isCloned.value = await repoExists()
    if (isCloned.value) await refreshCommitState()
    return isCloned.value
  }

  function updateSettings(next: Partial<GitSettings>) {
    Object.assign(settings, next)
    saveSettings(settings)
  }

  async function resetApp() {
    isBusy.value = true
    lastError.value = null

    try {
      await withGitLock(async () => {
        await withStorageErrors(async () => {
          await wipeFilesystem()
        })
        clearStoredSettings()
        Object.assign(settings, defaultSettings())
        lastLocalCommitAt = null
        lastPushedCommitOid = null
        isCloned.value = false
        syncStatus.value = 'idle'
        hasUnpushedCommits.value = false
      })
    } finally {
      isBusy.value = false
    }
  }

  async function clone() {
    if (!settings.repoUrl.trim()) {
      throw new Error('Repository URL is required')
    }
    if (!settings.token.trim()) {
      throw new Error('Personal access token is required')
    }

    isBusy.value = true
    lastError.value = null

    try {
      await withGitLock(async () => {
        await withStorageErrors(async () => {
          await git.clone({
            ...remoteGitOptions(settings),
            url: settings.repoUrl.trim(),
            depth: INITIAL_CLONE_DEPTH,
          })
        })
        isCloned.value = true
        const head = await resolveHeadOid()
        saveLastPushedCommitOid(head)
        saveClonedAt(Date.now())
        sessionStorage.removeItem(gitMtimesSessionKey())
        await refreshCommitState()
        await ensureSessionGitMtimes()
      })
    } finally {
      isBusy.value = false
    }
  }

  async function pullWithNotesMerge(cache: object = {}) {
    await withMissingObjectRecovery(async () => {
      const branch = await git.currentBranch({ fs, dir: REPO_DIR })
      if (!branch) throw new Error('No current branch')

      const { fetchHead } = await git.fetch({
        ...remoteGitOptions(settings),
        cache,
        // Keep routine sync shallow; recovery fetch uses RECOVERY_HISTORY_DEPTH.
        depth: INITIAL_CLONE_DEPTH,
      })

      if (!fetchHead) return

      const head = await resolveHeadOid()
      if (fetchHead === head) return

      await git.merge({
        fs,
        dir: REPO_DIR,
        ours: branch,
        theirs: fetchHead,
        fastForward: true,
        fastForwardOnly: false,
        abortOnConflict: false,
        mergeDriver: notesMergeDriver,
        author: settings.author,
        committer: settings.author,
        cache,
      })

      // Merge updates HEAD/index; workdir can still hold pre-merge blobs. force applies
      // the merged tree (notesMergeDriver already combined local + remote).
      await git.checkout({ fs, dir: REPO_DIR, ref: branch, force: true, cache })
    })
  }

  async function pushToRemote(cache: object = {}) {
    await withMissingObjectRecovery(async () => {
      await git.push({
        fs,
        http,
        dir: REPO_DIR,
        corsProxy: corsProxyForRepo(settings.corsProxy, settings.repoUrl),
        headers: authHeaders(settings),
        onAuth: auth(settings),
        cache,
      })
    })
  }

  async function sync() {
    if (!isCloned.value || !navigator.onLine) return

    syncStatus.value = 'syncing'
    lastError.value = null
    isBusy.value = true

    try {
      await withGitLock(async () => {
        // Single cache shared across all git operations in this sync so the
        // pack file is read and SHA-1-verified only once. After sync() returns
        // the cache goes out of scope, releasing the pack Uint8Array for GC.
        const cache = {}

        try {
          await pushToRemote(cache)
        } catch (err) {
          if (!isPushNotFastForward(err)) throw err
          await pullWithNotesMerge(cache)
          await pushToRemote(cache)
        }

        saveLastPushedCommitOid(await resolveHeadOid())
        await refreshCommitState(cache)
      })

      syncStatus.value = 'idle'
      console.log('[git] sync complete')
    } catch (err) {
      syncStatus.value = 'error'
      lastError.value = errorMessage(err)
      reportError('git sync', err)
      throw err
    } finally {
      isBusy.value = false
    }
  }

  async function commitFile(filepath: string, message?: string) {
    let amended = false
    // Shared so add/commit/log parse and SHA-1-verify the pack once per persist.
    let cache = {}
    await withMissingObjectRecovery(async () => {
      cache = {}
      await git.add({ fs, dir: REPO_DIR, filepath, cache })
      amended = await shouldAmendCommit()
      await git.commit({
        fs,
        dir: REPO_DIR,
        message: message ?? `update ${filepath}`,
        author: settings.author,
        amend: amended,
        cache,
      })
    })
    await refreshCommitState(cache)
    console.log(amended ? `[git] amended commit: ${filepath}` : `[git] commit: ${filepath}`)
    await notifyAfterCommit(filepath)
  }

  async function listFiles(): Promise<string[]> {
    const files = await collectNoteFiles(REPO_DIR, '')
    return files.sort()
  }

  async function listRecentNotes(): Promise<RecentNote[]> {
    const names = await listFiles()
    const clonedAt = loadClonedAt()
    const gitTimes = clonedAt ? await ensureSessionGitMtimes() : {}
    const withDates = await Promise.all(
      names.map(async (filepath) => {
        try {
          // Avoid git.log({ filepath }): it walks history until that file's blob
          // changes, so untouched notes scan the whole pack. N files accumulate.
          const { mtimeMs } = await pfs.stat(`${REPO_DIR}/${filepath}`)
          return {
            filepath,
            lastModified: resolveRecentLastModified(mtimeMs, clonedAt, gitTimes[filepath]),
          }
        } catch {
          return { filepath, lastModified: 0 }
        }
      }),
    )

    return withDates.sort((a, b) => b.lastModified - a.lastModified)
  }

  async function readFile(filepath: string): Promise<string> {
    return pfs.readFile(`${REPO_DIR}/${filepath}`, 'utf8')
  }

  async function readFileBinary(filepath: string): Promise<Uint8Array> {
    const data = await pfs.readFile(`${REPO_DIR}/${filepath}`)
    return data instanceof Uint8Array ? data : new Uint8Array(data)
  }

  /** Write file to disk, then commit (amending if within the coalesce window and unpushed). */
  async function writeFile(filepath: string, content: string) {
    await withGitLock(async () => {
      await withStorageErrors(async () => {
        await ensureParentDirs(filepath)
        await pfs.writeFile(`${REPO_DIR}/${filepath}`, content, 'utf8')
      })
      await commitFile(filepath)
    })
  }

  async function createFile(options?: ResolveNewNoteOptions, content = '') {
    const existing = await listFiles()
    const filename = resolveNewNoteFilename(options, existing)

    try {
      await pfs.stat(`${REPO_DIR}/${filename}`)
      throw new Error('File already exists')
    } catch (err) {
      if (err instanceof Error && err.message === 'File already exists') throw err
    }

    await writeFile(filename, content)
    return filename
  }

  async function moveFile(filepath: string, targetFolder: string, content?: string) {
    return withGitLock(async () => {
      const existing = await listFiles()
      const newPath = resolveMoveNotePath(filepath, targetFolder, existing)
      if (newPath === filepath) {
        throw new Error('Note is already in that folder')
      }

      const fileContent = content ?? (isPdfFile(filepath) ? null : await readFile(filepath))

      await withStorageErrors(async () => {
        await ensureParentDirs(newPath)
        if (isPdfFile(filepath)) {
          const bytes = await readFileBinary(filepath)
          await pfs.writeFile(`${REPO_DIR}/${newPath}`, bytes)
        } else {
          await pfs.writeFile(`${REPO_DIR}/${newPath}`, fileContent!, 'utf8')
        }
        await pfs.unlink(`${REPO_DIR}/${filepath}`)
      })

      let amended = false
      await withMissingObjectRecovery(async () => {
        await git.updateIndex({ fs, dir: REPO_DIR, filepath, remove: true })
        await git.add({ fs, dir: REPO_DIR, filepath: newPath })
        amended = await shouldAmendCommit()
        await git.commit({
          fs,
          dir: REPO_DIR,
          message: `move ${filepath} to ${newPath}`,
          author: settings.author,
          amend: amended,
        })
      })
      await refreshCommitState()
      console.log(amended ? `[git] amended commit: ${newPath}` : `[git] commit: ${newPath}`)
      await notifyAfterCommit(newPath)
      return newPath
    })
  }

  async function deleteFile(filepath: string) {
    await withGitLock(async () => {
      await withStorageErrors(async () => {
        await pfs.unlink(`${REPO_DIR}/${filepath}`)
      })
      let amended = false
      await withMissingObjectRecovery(async () => {
        await git.updateIndex({ fs, dir: REPO_DIR, filepath, remove: true })
        amended = await shouldAmendCommit()
        await git.commit({
          fs,
          dir: REPO_DIR,
          message: `delete ${filepath}`,
          author: settings.author,
          amend: amended,
        })
      })
      await refreshCommitState()
      console.log(amended ? `[git] amended commit: ${filepath}` : `[git] commit: ${filepath}`)
      await notifyAfterCommit(filepath)
    })
  }

  function onAfterCommit(listener: (filepath: string) => void | Promise<void>) {
    afterCommitListeners.add(listener)
    return () => afterCommitListeners.delete(listener)
  }

  return {
    settings,
    isCloned,
    syncStatus,
    lastError,
    isBusy,
    hasUnpushedCommits,
    checkCloned,
    setupBrowserStorage,
    updateSettings,
    resetApp,
    clone,
    sync,
    commitFile,
    listFiles,
    listRecentNotes,
    readFile,
    readFileBinary,
    writeFile,
    createFile,
    moveFile,
    deleteFile,
    onAfterCommit,
  }
}
