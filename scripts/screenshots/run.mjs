// Regenerates the README screenshots in docs/images using a dummy notes repo.
// See README.md in this directory.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { buildDummyRepo } from './build-repo.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const OUT = resolve(process.env.OUT_DIR ?? join(repoRoot, 'docs/images'))
const APP_URL = process.env.APP_URL ?? 'http://localhost:55111/'
const GIT_PORT = Number(process.env.GIT_PORT ?? 8199)
const REPO_URL = `http://localhost:${GIT_PORT}/notes.git`

const waitForPort = (port) =>
  new Promise((resolvePort, reject) => {
    const deadline = Date.now() + 10_000
    const attempt = () => {
      if (Date.now() > deadline) return reject(new Error(`nothing listening on port ${port}`))
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.end()
        resolvePort()
      })
      socket.on('error', () => setTimeout(attempt, 100))
    }
    attempt()
  })

// Headless Chromium denies persistent storage, which would show a warning toast.
const stubStoragePersist = (page) =>
  page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'persist', { value: async () => true })
    Object.defineProperty(navigator.storage, 'persisted', { value: async () => true })
  })

const clearToasts = (page) =>
  page.waitForFunction(() => document.querySelectorAll('[data-sonner-toast]').length === 0, null, {
    timeout: 20_000,
  })

const blurActiveElement = (page) =>
  page.evaluate(
    () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
  )

// Headless Linux picks a colour emoji font for the bare arrow of link chips; use a text font like macOS does.
const fixChipArrow = (page) =>
  page.addStyleTag({
    content:
      ".link-chip::before { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif !important; }",
  })

async function newPage(browser, options) {
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'UTC', ...options })
  const page = await context.newPage()
  await stubStoragePersist(page)
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200))
  })
  return page
}

async function cloneRepo(page, name, email) {
  await page.goto(APP_URL)
  await page.getByLabel('Commit Name').waitFor()
  await page.getByLabel('Commit Name').fill(name)
  await page.getByLabel('Commit E-Mail').fill(email)
  return async () => {
    await page.getByLabel('Repository URL').fill(REPO_URL)
    // The mock server ignores auth, but the form requires a token.
    await page.getByLabel('Personal Access Token').fill('dummy-token')
    await page.getByRole('button', { name: 'Clone Repository' }).click()
  }
}

async function phoneScreenshots(browser) {
  const page = await newPage(browser, {
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  // Short email so the field does not scroll/overflow in the shot.
  const submit = await cloneRepo(page, 'Alex', 'alex@mail.dev')
  await blurActiveElement(page)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/setup_screen.png` })

  await submit()
  await page.getByText('Weekend shelf build').first().waitFor({ timeout: 30_000 })
  await clearToasts(page) // "Repository cloned"
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/recent_screen.png` })

  await page.getByText('Weekend shelf build').first().click()
  await page.locator('.ProseMirror').waitFor()
  await page.waitForTimeout(2000)
  await blurActiveElement(page) // the editor focuses itself; no caret/dialog in the shot
  await page.waitForTimeout(500)
  await fixChipArrow(page)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/example_note.png` })
  await page.context().close()
}

async function whiteboardScreenshot(browser) {
  const page = await newPage(browser, {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  const submit = await cloneRepo(page, 'Alex', 'alex@mail.dev')
  await submit()
  await page.getByText('Shelf project').first().waitFor({ timeout: 30_000 })
  await clearToasts(page)

  await page.getByText('Shelf project').first().click()
  await page.waitForTimeout(3000)
  await blurActiveElement(page)
  await fixChipArrow(page)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/whiteboard.png` })
  await page.context().close()
}

const work = mkdtempSync(join(tmpdir(), 'nomagi-screenshots-'))
let gitServer
let browser
try {
  buildDummyRepo(work)

  gitServer = spawn(
    process.execPath,
    [join(repoRoot, 'node_modules/git-http-mock-server/http-server.js')],
    {
      cwd: join(work, 'repos'),
      env: { ...process.env, GIT_HTTP_MOCK_SERVER_PORT: String(GIT_PORT) },
      stdio: 'ignore',
    },
  )
  await waitForPort(GIT_PORT)

  browser = await chromium.launch()
  await phoneScreenshots(browser)
  await whiteboardScreenshot(browser)
  console.log(`Screenshots written to ${OUT}`)
} finally {
  await browser?.close()
  gitServer?.kill()
  rmSync(work, { recursive: true, force: true })
}
