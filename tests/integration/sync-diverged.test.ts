import { beforeEach, describe, expect, it } from 'vitest'
import { createGitHarness } from '../git-harness'
import { mockGitRepoUrl, pushRemoteNoteToFixture, resetRemoteToBase } from '../mock-git-server'

describe.sequential('sync with diverged remote (git-http-mock-server)', () => {
  const repoUrl = () => mockGitRepoUrl()

  beforeEach(() => {
    resetRemoteToBase()
  })
  // Local commit + remote advance on the fixture; sync must merge and apply the
  // result to the workdir (checkout with force — see pullWithNotesMerge in useGit).
  it('merges and updates workdir after non-fast-forward push', async () => {
    const client = createGitHarness(repoUrl())
    await client.clone()
    await client.writeFile('note.md', 'local\n')
    pushRemoteNoteToFixture('note.md', 'remote\n')

    await expect(client.sync()).resolves.toBeUndefined()

    const merged = await client.readFile('note.md')
    expect(merged).toContain('local')
    expect(merged).toContain('remote')
  })

  // Another device pushed more commits than the shallow fetch depth since our
  // last sync, so the fetched history does not reach the common ancestor.
  it('merges nearby line edits when the remote advanced past the fetch depth', async () => {
    pushRemoteNoteToFixture('note.md', 'title\none\ntwo\nthree\n')
    const client = createGitHarness(repoUrl())
    await client.clone()
    await client.writeFile('note.md', 'title\none\nlocal\ntwo\nthree\n')
    const remoteEdits = Array.from(
      { length: 12 },
      (_, i) => `title\none\ntwo\nremote ${i}\nthree\n`,
    )
    pushRemoteNoteToFixture('note.md', ...remoteEdits)

    await expect(client.sync()).resolves.toBeUndefined()

    const merged = await client.readFile('note.md')
    expect(merged).toContain('local')
    expect(merged).toContain('remote 11')
  })

  // Delete/modify conflicts bypass the merge driver; keep the edited file.
  it('keeps remote edits to a note that was renamed locally', async () => {
    const client = createGitHarness(repoUrl())
    await client.clone()
    await client.renameFile('note.md', 'renamed.md')
    pushRemoteNoteToFixture('note.md', 'base\nremote\n')

    await expect(client.sync()).resolves.toBeUndefined()

    await expect(client.readFile('renamed.md')).resolves.toBe('base\n')
    await expect(client.readFile('note.md')).resolves.toBe('base\nremote\n')
  })

  it('keeps remote-only files when local diverged without them', async () => {
    const client = createGitHarness(repoUrl())
    await client.clone()
    pushRemoteNoteToFixture('remote-only.md', 'from remote\n')
    await client.writeFile('note.md', 'local\n')

    await expect(client.sync()).resolves.toBeUndefined()

    await expect(client.readFile('remote-only.md')).resolves.toContain('from remote')
    await expect(client.readFile('note.md')).resolves.toContain('local')
  })
})
