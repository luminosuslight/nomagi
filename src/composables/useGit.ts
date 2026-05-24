import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import LightningFS from '@isomorphic-git/lightning-fs'
import { reactive, ref } from 'vue'
import { errorMessage, reportError } from '@/lib/errors'

export type GitSettings = {
  repoUrl: string
  token: string
  corsProxy: string
  author: { name: string; email: string }
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

const REPO_DIR = '/repo'
const FS_NAME = 'git-notes-fs'

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

async function repoExists(): Promise<boolean> {
  try {
    await pfs.stat(`${REPO_DIR}/.git`)
    return true
  } catch {
    return false
  }
}

const settings = reactive(loadSettings())
const isCloned = ref(false)
const syncStatus = ref<SyncStatus>('idle')
const lastError = ref<string | null>(null)
const isBusy = ref(false)

export function useGit() {
  async function checkCloned() {
    isCloned.value = await repoExists()
    return isCloned.value
  }

  function updateSettings(next: Partial<GitSettings>) {
    Object.assign(settings, next)
    saveSettings(settings)
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
    } finally {
      isBusy.value = false
    }
  }

  async function sync() {
    if (!isCloned.value || !navigator.onLine) return

    syncStatus.value = 'syncing'
    lastError.value = null
    isBusy.value = true

    try {
      await git.pull({
        fs,
        http,
        dir: REPO_DIR,
        corsProxy: corsProxy(settings),
        headers: authHeaders(settings),
        onAuth: auth(settings),
        fastForwardOnly: true,
        author: settings.author,
      })

      await git.push({
        fs,
        http,
        dir: REPO_DIR,
        corsProxy: corsProxy(settings),
        headers: authHeaders(settings),
        onAuth: auth(settings),
      })

      syncStatus.value = 'idle'
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
    await git.commit({
      fs,
      dir: REPO_DIR,
      message: message ?? `update ${filepath}`,
      author: settings.author,
    })
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

  async function readFile(filepath: string): Promise<string> {
    return pfs.readFile(`${REPO_DIR}/${filepath}`, 'utf8')
  }

  async function writeFile(filepath: string, content: string) {
    await pfs.writeFile(`${REPO_DIR}/${filepath}`, content, 'utf8')
    await commitFile(filepath)
  }

  return {
    settings,
    isCloned,
    syncStatus,
    lastError,
    isBusy,
    checkCloned,
    updateSettings,
    clone,
    sync,
    commitFile,
    listMarkdownFiles,
    readFile,
    writeFile,
  }
}
