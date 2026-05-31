import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const FIXTURES_DIR = join(__dirname, 'fixtures')
const BARE_REPO = join(FIXTURES_DIR, 'notes-sync.git')
const DEFAULT_PORT = 8174
const HTTP_SERVER_JS = join(process.cwd(), 'node_modules/git-http-mock-server/http-server.js')

let serverProcess: ChildProcess | null = null

function git(args: string[], cwd: string) {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

export function mockGitRepoUrl(port = DEFAULT_PORT): string {
  return `http://localhost:${port}/notes-sync.git`
}

export function prepareBareFixture() {
  mkdirSync(FIXTURES_DIR, { recursive: true })
  if (existsSync(join(BARE_REPO, 'HEAD'))) {
    rmSync(BARE_REPO, { recursive: true, force: true })
  }

  git(['init', '--bare', 'notes-sync.git'], FIXTURES_DIR)

  const work = mkdtempSync(join(tmpdir(), 'nomagi-fixture-'))
  try {
    git(['init'], work)
    git(['config', 'user.email', 'notes@test'], work)
    git(['config', 'user.name', 'Notes'], work)
    writeFileSync(join(work, 'note.md'), 'base\n')
    git(['add', 'note.md'], work)
    git(['commit', '-m', 'base'], work)
    git(['branch', '-M', 'main'], work)
    git(['remote', 'add', 'origin', BARE_REPO], work)
    git(['push', '-u', 'origin', 'main'], work)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function waitForServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000

    const tryConnect = () => {
      if (Date.now() > deadline) {
        reject(new Error(`git-http-mock-server did not listen on port ${port}`))
        return
      }

      const socket = net.connect(port, '127.0.0.1', () => {
        socket.end()
        resolve()
      })
      socket.on('error', () => {
        setTimeout(tryConnect, 100)
      })
    }

    tryConnect()
  })
}

export async function startMockGitServer() {
  prepareBareFixture()
  if (serverProcess) return

  serverProcess = spawn(process.execPath, [HTTP_SERVER_JS], {
    cwd: FIXTURES_DIR,
    stdio: 'pipe',
    env: { ...process.env, GIT_HTTP_MOCK_SERVER_PORT: String(DEFAULT_PORT) },
  })

  serverProcess.on('error', (err) => {
    console.error('[mock-git-server]', err)
  })

  await waitForServer(DEFAULT_PORT)
}

export function stopMockGitServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

/**
 * Reset the on-disk bare fixture (served on fetch via git-upload-pack `find`).
 * HTTP pushes go to a COW copy and are not visible to fetch — update the fixture directly.
 */
export function resetRemoteToBase() {
  prepareBareFixture()
}

/** Add a divergent commit on the bare fixture (visible to isomorphic-git fetch). */
export function pushRemoteNoteToFixture(filepath: string, content: string) {
  const work = mkdtempSync(join(tmpdir(), 'nomagi-remote-'))
  try {
    git(['clone', '--branch', 'main', BARE_REPO, '.'], work)
    writeFileSync(join(work, filepath), content)
    git(['add', filepath], work)
    git(['commit', '-m', 'remote'], work)
    git(['push', 'origin', 'main'], work)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
