import git from 'isomorphic-git'
import { createFsFromVolume, Volume } from 'memfs'
import { describe, expect, it } from 'vitest'
import { collectGitNoteMtimes, resolveRecentLastModified } from '@/lib/recentNoteMtimes'

describe('resolveRecentLastModified', () => {
  it('uses filesystem mtime when clone time is unknown', () => {
    expect(resolveRecentLastModified(1_000, null, 500)).toBe(1_000)
  })

  it('uses filesystem mtime when it is newer than clone time', () => {
    expect(resolveRecentLastModified(2_000, 1_000, 500)).toBe(2_000)
  })

  it('uses the git walk time when mtime is not newer than clone time', () => {
    expect(resolveRecentLastModified(1_000, 1_000, 500)).toBe(500)
    expect(resolveRecentLastModified(900, 1_000, 500)).toBe(500)
  })

  it('returns unknown when mtime is stale and the file was not in the walk', () => {
    expect(resolveRecentLastModified(1_000, 1_000, undefined)).toBe(0)
    expect(resolveRecentLastModified(1_000, 1_000, 0)).toBe(0)
  })
})

describe('collectGitNoteMtimes', () => {
  it('records the newest commit time per note in shallow history', async () => {
    const fs = createFsFromVolume(new Volume())
    const dir = '/repo'
    const author = { name: 'Notes', email: 'notes@test' }
    await fs.promises.mkdir(dir)
    await git.init({ fs, dir })
    await fs.promises.writeFile(`${dir}/old.md`, 'a')
    await fs.promises.writeFile(`${dir}/recent.md`, 'a')
    await git.add({ fs, dir, filepath: '.' })
    await git.commit({
      fs,
      dir,
      message: 'initial',
      author: { ...author, timestamp: 1_000 },
      committer: { ...author, timestamp: 1_000 },
    })
    await fs.promises.writeFile(`${dir}/recent.md`, 'b')
    await git.add({ fs, dir, filepath: 'recent.md' })
    await git.commit({
      fs,
      dir,
      message: 'update recent',
      author: { ...author, timestamp: 2_000 },
      committer: { ...author, timestamp: 2_000 },
    })

    const times = await collectGitNoteMtimes({ fs, dir, depth: 10 })
    expect(times['recent.md']).toBe(2_000_000)
    expect(times['old.md']).toBe(1_000_000)
  })
})

describe('resolveRecentLastModified', () => {
  it('uses filesystem mtime when clone time is unknown', () => {
    expect(resolveRecentLastModified(1_000, null, 500)).toBe(1_000)
  })

  it('uses filesystem mtime when it is newer than clone time', () => {
    expect(resolveRecentLastModified(2_000, 1_000, 500)).toBe(2_000)
  })

  it('uses the git walk time when mtime is not newer than clone time', () => {
    expect(resolveRecentLastModified(1_000, 1_000, 500)).toBe(500)
    expect(resolveRecentLastModified(900, 1_000, 500)).toBe(500)
  })

  it('returns unknown when mtime is stale and the file was not in the walk', () => {
    expect(resolveRecentLastModified(1_000, 1_000, undefined)).toBe(0)
    expect(resolveRecentLastModified(1_000, 1_000, 0)).toBe(0)
  })
})
