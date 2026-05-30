import git, { Errors } from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import LightningFS from '@isomorphic-git/lightning-fs'
import { reactive, ref } from 'vue'
import { errorMessage, reportError } from '@/lib/errors'
import { notesMergeDriver } from '@/lib/notesMergeDriver'

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
/** Amend the previous commit when a new persist falls within this window. */
export const COMMIT_AMEND_WINDOW_MS = 60_000
const LAST_PUSHED_OID_KEY = 'lastPushedCommitOid'

const fs = new LightningFS(FS_NAME)
const pfs = fs.promises

function loadSettings(): GitSettings {
  const storedProxy = localStorage.getItem('corsProxy')
  const corsProxy =
    !storedProxy || storedProxy === 'https://cors.isomorphic-git.org' ? '/git-cors' : storedProxy

  return {
    repoUrl: localStorage.getItem('repoUrl') ?? '',
    token: localStorage.getItem('token') ?? '',
    corsProxy,
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
      key.startsWith(pushedPrefix)
    ) {
      keys.push(key)
    }
  }
  for (const key of keys) localStorage.removeItem(key)
}

async function rmRecursive(path: string): Promise<void> {
  let stat
  try {
    stat = await pfs.stat(path)
  } catch {
    return
  }
  if (stat.isDirectory()) {
    const entries = await pfs.readdir(path)
    await Promise.all(entries.map((name) => rmRecursive(`${path}/${name}`)))
    await pfs.rmdir(path)
  } else {
    await pfs.unlink(path)
  }
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

function corsProxy(settings: GitSettings) {
  return settings.corsProxy.trim() || undefined
}

function isPushNotFastForward(err: unknown): boolean {
  return (
    err instanceof Errors.PushRejectedError &&
    err.data.reason === 'not-fast-forward'
  )
}

export function normalizeMarkdownFilename(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Filename is required')
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

export function generateIsoDateFilename(now = new Date()): string {
  const y = now.getFullYear()
  const m = padTwo(now.getMonth() + 1)
  const d = padTwo(now.getDate())
  const h = padTwo(now.getHours())
  const min = padTwo(now.getMinutes())
  const s = padTwo(now.getSeconds())
  return `${y}-${m}-${d}T${h}-${min}-${s}.md`
}

export function uniqueIsoDateFilename(existingFiles: Iterable<string>, now = new Date()): string {
  const existing = new Set(existingFiles)
  const base = generateIsoDateFilename(now)
  if (!existing.has(base)) return base

  let suffix = 2
  while (true) {
    const candidate = base.replace(/\.md$/, `-${suffix}.md`)
    if (!existing.has(candidate)) return candidate
    suffix++
  }
}

export function resolveNewNoteFilename(input: string | undefined, existingFiles: string[]): string {
  const trimmed = input?.trim() ?? ''
  if (!trimmed) return uniqueIsoDateFilename(existingFiles)
  return normalizeMarkdownFilename(trimmed)
}

async function repoExists(): Promise<boolean> {
  try {
    await pfs.stat(`${REPO_DIR}/.git`)
    return true
  } catch {
    return false
  }
}

const afterCommitListeners = new Set<() => void | Promise<void>>()

async function notifyAfterCommit() {
  await Promise.all([...afterCommitListeners].map((listener) => listener()))
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

function saveLastPushedCommitOid(oid: string) {
  lastPushedCommitOid = oid
  const repoUrl = settings.repoUrl.trim()
  if (repoUrl) localStorage.setItem(pushedOidStorageKey(), oid)
}

async function resolveHeadOid(): Promise<string> {
  return git.resolveRef({ fs, dir: REPO_DIR, ref: 'HEAD' })
}

async function refreshCommitState() {
  try {
    const head = await resolveHeadOid()
    lastPushedCommitOid = localStorage.getItem(pushedOidStorageKey()) ?? head
    hasUnpushedCommits.value = head !== lastPushedCommitOid

    const commits = await git.log({ fs, dir: REPO_DIR, depth: 1 })
    lastLocalCommitAt =
      commits.length > 0 ? commits[0].commit.committer.timestamp * 1000 : null
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
        await rmRecursive(REPO_DIR)
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
        await git.clone({
          fs,
          http,
          dir: REPO_DIR,
          url: settings.repoUrl.trim(),
          corsProxy: corsProxy(settings),
          headers: authHeaders(settings),
          onAuth: auth(settings),
          singleBranch: true,
          depth: 1,
        })
        isCloned.value = true
        const head = await resolveHeadOid()
        saveLastPushedCommitOid(head)
        await refreshCommitState()
      })
    } finally {
      isBusy.value = false
    }
  }

  async function pullWithNotesMerge() {
    const branch = await git.currentBranch({ fs, dir: REPO_DIR })
    if (!branch) throw new Error('No current branch')

    const { fetchHead } = await git.fetch({
      fs,
      http,
      dir: REPO_DIR,
      corsProxy: corsProxy(settings),
      headers: authHeaders(settings),
      onAuth: auth(settings),
      singleBranch: true,
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
    })

    await git.checkout({ fs, dir: REPO_DIR, ref: branch })
  }

  async function pushToRemote() {
    await git.push({
      fs,
      http,
      dir: REPO_DIR,
      corsProxy: corsProxy(settings),
      headers: authHeaders(settings),
      onAuth: auth(settings),
    })
  }

  async function sync() {
    if (!isCloned.value || !navigator.onLine) return

    syncStatus.value = 'syncing'
    lastError.value = null
    isBusy.value = true

    try {
      await withGitLock(async () => {
        try {
          await pushToRemote()
        } catch (err) {
          if (!isPushNotFastForward(err)) throw err
          await pullWithNotesMerge()
          await pushToRemote()
        }

        saveLastPushedCommitOid(await resolveHeadOid())
        await refreshCommitState()
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
    await git.add({ fs, dir: REPO_DIR, filepath })
    const amend = await shouldAmendCommit()
    await git.commit({
      fs,
      dir: REPO_DIR,
      message: message ?? `update ${filepath}`,
      author: settings.author,
      amend,
    })
    await refreshCommitState()
    console.log(amend ? `[git] amended commit: ${filepath}` : `[git] commit: ${filepath}`)
    await notifyAfterCommit()
  }

  async function listMarkdownFiles(): Promise<string[]> {
    const entries = await pfs.readdir(REPO_DIR)
    const files: string[] = []

    for (const name of entries) {
      if (!name.endsWith('.md') || name.startsWith('.')) continue
      const stat = await pfs.stat(`${REPO_DIR}/${name}`)
      if (stat.isFile()) files.push(name)
    }

    return files.sort()
  }

  async function listRecentNotes(): Promise<RecentNote[]> {
    const names = await listMarkdownFiles()
    const withDates = await Promise.all(
      names.map(async (filepath) => {
        try {
          const commits = await git.log({ fs, dir: REPO_DIR, filepath, depth: 1 })
          const lastModified =
            commits.length > 0 ? commits[0].commit.committer.timestamp * 1000 : 0
          return { filepath, lastModified }
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

  /** Write file to disk, then commit (amending if within the coalesce window and unpushed). */
  async function writeFile(filepath: string, content: string) {
    await withGitLock(async () => {
      await pfs.writeFile(`${REPO_DIR}/${filepath}`, content, 'utf8')
      await commitFile(filepath)
    })
  }

  async function createFile(filepath?: string, content = '') {
    const existing = await listMarkdownFiles()
    const filename = resolveNewNoteFilename(filepath, existing)

    try {
      await pfs.stat(`${REPO_DIR}/${filename}`)
      throw new Error('File already exists')
    } catch (err) {
      if (err instanceof Error && err.message === 'File already exists') throw err
    }

    await writeFile(filename, content)
    return filename
  }

  function onAfterCommit(listener: () => void | Promise<void>) {
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
    updateSettings,
    resetApp,
    clone,
    sync,
    commitFile,
    listMarkdownFiles,
    listRecentNotes,
    readFile,
    writeFile,
    createFile,
    onAfterCommit,
  }
}
