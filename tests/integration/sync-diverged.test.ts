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
})
