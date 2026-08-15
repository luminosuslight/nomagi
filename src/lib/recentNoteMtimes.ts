import git, { TREE } from 'isomorphic-git'
import { isNoteFile } from '@/lib/fileTypes'

export const CLONED_AT_KEY_PREFIX = 'nomagi-clonedAt:'
export const GIT_MTIMES_SESSION_PREFIX = 'nomagi-git-mtimes:'

export function resolveRecentLastModified(
  mtimeMs: number,
  clonedAt: number | null,
  gitTime: number | undefined,
): number {
  if (clonedAt == null) return mtimeMs
  if (mtimeMs > clonedAt) return mtimeMs
  return gitTime && gitTime > 0 ? gitTime : 0
}

type GitFs = Parameters<typeof git.log>[0]['fs']

/** Note paths whose blob changed in `oid` vs `parent` (all notes if no parent). */
async function notePathsChanged(args: {
  fs: GitFs
  dir: string
  cache: object
  oid: string
  parent?: string
}): Promise<string[]> {
  const { fs, dir, cache, oid, parent } = args
  const trees = parent ? [TREE({ ref: oid }), TREE({ ref: parent })] : [TREE({ ref: oid })]

  const walked = await git.walk({
    fs,
    dir,
    cache,
    trees,
    map: async (filepath, [current, previous]) => {
      if (filepath === '.') return
      if (!current || (await current.type()) !== 'blob') return
      if (!isNoteFile(filepath)) return
      if (!previous) return filepath
      if ((await previous.type()) !== 'blob') return filepath
      if ((await current.oid()) === (await previous.oid())) return
      return filepath
    },
  })

  return Array.isArray(walked)
    ? walked.filter((path): path is string => typeof path === 'string')
    : []
}

/** Newest committer time per note path among the last `depth` commits. */
export async function collectGitNoteMtimes(args: {
  fs: GitFs
  dir: string
  cache?: object
  depth: number
}): Promise<Record<string, number>> {
  const { fs, dir, cache = {}, depth } = args
  const commits = await git.log({ fs, dir, depth, cache })
  const times: Record<string, number> = {}

  for (const entry of commits) {
    const ts = entry.commit.committer.timestamp * 1000
    const changed = await notePathsChanged({
      fs,
      dir,
      cache,
      oid: entry.oid,
      parent: entry.commit.parent[0],
    })
    for (const filepath of changed) {
      if (times[filepath] === undefined) times[filepath] = ts
    }
  }

  return times
}
