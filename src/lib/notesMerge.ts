import git, { Errors, type FsClient, type TreeEntry } from 'isomorphic-git'
import { notesMergeDriver } from '@/lib/notesMergeDriver'

/** Deepening steps (commits behind the current shallow boundary) while looking for a merge base. */
const DEEPEN_STEPS = [30, 100, 300, 1000, 3000]

export type NotesMergeOptions = {
  fs: FsClient
  dir: string
  cache: object
  branch: string
  theirs: string
  author: { name: string; email: string }
  /** Fetch `depth` more commits behind the current shallow boundary. */
  deepen: (depth: number) => Promise<void>
}

async function findMergeBase(options: NotesMergeOptions, ours: string): Promise<string[]> {
  const { fs, dir, cache, theirs } = options
  return git.findMergeBase({ fs, dir, cache, oids: [ours, theirs] })
}

/**
 * Shallow history treats the boundary commits as roots. If the remote advanced
 * further than the fetch depth, the common ancestor is not reachable and
 * isomorphic-git reports a (misleading) MergeNotSupportedError.
 */
async function ensureMergeBase(options: NotesMergeOptions, ours: string): Promise<void> {
  for (const depth of DEEPEN_STEPS) {
    if ((await findMergeBase(options, ours)).length > 0) return
    await options.deepen(depth)
  }
}

async function treeWithBlob(
  options: NotesMergeOptions,
  treeOid: string | undefined,
  parts: string[],
  blobOid: string,
): Promise<string> {
  const { fs, dir, cache } = options
  const entries: TreeEntry[] = treeOid
    ? (await git.readTree({ fs, dir, cache, oid: treeOid })).tree
    : []
  const [name, ...rest] = parts
  const existing = entries.find((entry) => entry.path === name)
  const entry: TreeEntry =
    rest.length === 0
      ? { mode: '100644', path: name, oid: blobOid, type: 'blob' }
      : {
          mode: '040000',
          path: name,
          type: 'tree',
          oid: await treeWithBlob(
            options,
            existing?.type === 'tree' ? existing.oid : undefined,
            rest,
            blobOid,
          ),
        }
  return git.writeTree({
    fs,
    dir,
    tree: [...entries.filter((e) => e.path !== name), entry],
  })
}

/**
 * Commit on top of `parent` that brings back the merge-base version of `filepaths`.
 * Turns "deleted on one side, edited on the other" (e.g. rename vs. edit) into a
 * plain edit, so the merge keeps the edited file instead of failing.
 */
async function restoreFromBase(
  options: NotesMergeOptions,
  parent: string,
  base: string,
  filepaths: string[],
  updateBranch: boolean,
): Promise<string> {
  const { fs, dir, cache, author, branch } = options
  let tree = (await git.readCommit({ fs, dir, cache, oid: parent })).commit.tree
  for (const filepath of filepaths) {
    const { oid } = await git.readBlob({ fs, dir, cache, oid: base, filepath })
    tree = await treeWithBlob(options, tree, filepath.split('/'), oid)
  }
  return git.commit({
    fs,
    dir,
    cache,
    message: `keep ${filepaths.join(', ')} (deleted or renamed on one device, edited on another)`,
    author,
    tree,
    parent: [parent],
    ref: `refs/heads/${branch}`,
    noUpdateBranch: !updateBranch,
  })
}

/**
 * Merge `theirs` into `branch` without ever producing conflicts: text edits go
 * through notesMergeDriver, delete/modify conflicts keep the modified file.
 * Leaves HEAD at the merge result; the caller must check out the workdir.
 */
export async function mergeNotes(options: NotesMergeOptions): Promise<void> {
  const { fs, dir, cache, branch, author } = options
  let ours = await git.resolveRef({ fs, dir, ref: branch })
  let theirs = options.theirs
  await ensureMergeBase(options, ours)

  const merge = () =>
    git.merge({
      fs,
      dir,
      cache,
      ours: branch,
      theirs,
      fastForward: true,
      fastForwardOnly: false,
      abortOnConflict: true,
      mergeDriver: notesMergeDriver,
      author,
      committer: author,
    })

  try {
    await merge()
  } catch (err) {
    if (!(err instanceof Errors.MergeConflictError)) throw err
    const { deleteByUs, deleteByTheirs } = err.data
    if (deleteByUs.length === 0 && deleteByTheirs.length === 0) throw err

    const [base] = await findMergeBase(options, ours)
    if (deleteByUs.length > 0) {
      ours = await restoreFromBase(options, ours, base, deleteByUs, true)
    }
    if (deleteByTheirs.length > 0) {
      theirs = await restoreFromBase(options, theirs, base, deleteByTheirs, false)
    }
    await merge()
  }
}

/**
 * Older versions merged with `abortOnConflict: false`, which can leave conflict
 * stages in the index and block every later commit/merge. Resolve them to the
 * workdir content (which holds the merge result).
 */
export async function withUnmergedIndexRecovery<T>(
  fs: FsClient,
  dir: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!(err instanceof Errors.UnmergedPathsError)) throw err
    for (const filepath of err.data.filepaths) {
      try {
        await git.add({ fs, dir, filepath })
      } catch {
        await git.remove({ fs, dir, filepath })
      }
    }
    return fn()
  }
}
