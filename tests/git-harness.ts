import git, { Errors } from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { createFsFromVolume, Volume } from 'memfs'
import { mergeNotes, withUnmergedIndexRecovery } from '@/lib/notesMerge'

const REPO_DIR = '/repo'

const author = { name: 'Notes', email: 'notes@test' }

function isPushNotFastForward(err: unknown): boolean {
  return err instanceof Errors.PushRejectedError && err.data.reason === 'not-fast-forward'
}

export type GitHarness = ReturnType<typeof createGitHarness>

export function createGitHarness(repoUrl: string) {
  const checkoutForce = true
  const fs = createFsFromVolume(new Volume())
  const pfs = fs.promises

  async function resolveHeadOid(): Promise<string> {
    return git.resolveRef({ fs, dir: REPO_DIR, ref: 'HEAD' })
  }

  async function pullWithNotesMerge() {
    const branch = await git.currentBranch({ fs, dir: REPO_DIR })
    if (!branch) throw new Error('No current branch')

    const { fetchHead } = await git.fetch({
      fs,
      http,
      dir: REPO_DIR,
      url: repoUrl,
      singleBranch: true,
      depth: 10,
    })

    if (!fetchHead) return

    const head = await resolveHeadOid()
    if (fetchHead === head) return

    await withUnmergedIndexRecovery(fs, REPO_DIR, () =>
      mergeNotes({
        fs,
        dir: REPO_DIR,
        cache: {},
        branch,
        theirs: fetchHead,
        author,
        deepen: async (depth) => {
          await git.fetch({
            fs,
            http,
            dir: REPO_DIR,
            url: repoUrl,
            singleBranch: true,
            depth,
            relative: true,
          })
        },
      }),
    )

    await git.checkout({ fs, dir: REPO_DIR, ref: branch, force: checkoutForce })
  }

  async function pushToRemote() {
    await git.push({
      fs,
      http,
      dir: REPO_DIR,
      url: repoUrl,
    })
  }

  return {
    async clone() {
      await git.clone({
        fs,
        http,
        dir: REPO_DIR,
        url: repoUrl,
        singleBranch: true,
        depth: 10,
      })
    },

    async writeFile(filepath: string, content: string) {
      const slash = filepath.lastIndexOf('/')
      if (slash !== -1)
        await pfs.mkdir(`${REPO_DIR}/${filepath.slice(0, slash)}`, { recursive: true })
      await pfs.writeFile(`${REPO_DIR}/${filepath}`, content, { encoding: 'utf8' })
      await git.add({ fs, dir: REPO_DIR, filepath })
      await git.commit({
        fs,
        dir: REPO_DIR,
        message: `update ${filepath}`,
        author,
      })
    },

    async renameFile(filepath: string, newPath: string) {
      const content = await pfs.readFile(`${REPO_DIR}/${filepath}`)
      const slash = newPath.lastIndexOf('/')
      if (slash !== -1)
        await pfs.mkdir(`${REPO_DIR}/${newPath.slice(0, slash)}`, { recursive: true })
      await pfs.writeFile(`${REPO_DIR}/${newPath}`, content)
      await pfs.unlink(`${REPO_DIR}/${filepath}`)
      await git.updateIndex({ fs, dir: REPO_DIR, filepath, remove: true })
      await git.add({ fs, dir: REPO_DIR, filepath: newPath })
      await git.commit({ fs, dir: REPO_DIR, message: `rename ${filepath}`, author })
    },

    async readFile(filepath: string): Promise<string> {
      return pfs.readFile(`${REPO_DIR}/${filepath}`, { encoding: 'utf8' })
    },

    async sync() {
      try {
        await pushToRemote()
      } catch (err) {
        if (!isPushNotFastForward(err)) throw err
        await pullWithNotesMerge()
        await pushToRemote()
      }
    },
  }
}
