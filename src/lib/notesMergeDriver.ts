import diff3Merge from 'diff3'
import type { MergeDriverCallback } from 'isomorphic-git'

const LINEBREAKS = /^.*(\r?\n|$)/gm

/** On conflict, append the remote side after the local side (no markers). */
function mergeConflictHunk(aLines: string[], bLines: string[]): string {
  const aText = aLines.join('')
  const bText = bLines.join('')
  if (aText === bText) return aText
  if (!aText.trim()) return bText
  if (!bText.trim()) return aText
  const separator = aText.endsWith('\n') || !aText ? '' : '\n'
  return `${aText}${separator}${bText}`
}

function mergeWholeDocuments(ours: string, theirs: string): string {
  if (ours === theirs) return ours
  if (!ours.trim()) return theirs
  if (!theirs.trim()) return ours
  return `${ours.trimEnd()}\n\n---\n\n${theirs.trimEnd()}`
}

/**
 * Notes merge driver: diff3 when edits don't overlap; on conflict, keep both
 * sides so nothing is lost (user can trim the result manually).
 */
export const notesMergeDriver: MergeDriverCallback = ({ contents }) => {
  const baseContent = contents[0]
  const ourContent = contents[1]
  const theirContent = contents[2]

  if (ourContent === theirContent) {
    return { cleanMerge: true, mergedText: ourContent }
  }

  const ours = ourContent.match(LINEBREAKS)
  const base = baseContent.match(LINEBREAKS) ?? []
  const theirs = theirContent.match(LINEBREAKS)

  if (!ours || !theirs) {
    return { cleanMerge: true, mergedText: mergeWholeDocuments(ourContent, theirContent) }
  }

  const result = diff3Merge(ours, base, theirs)
  let mergedText = ''

  for (const item of result) {
    if ('ok' in item && item.ok) {
      mergedText += item.ok.join('')
    }
    if ('conflict' in item && item.conflict) {
      mergedText += mergeConflictHunk(item.conflict.a, item.conflict.b)
    }
  }

  return { cleanMerge: true, mergedText }
}
