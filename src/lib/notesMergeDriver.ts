import diff3Merge from 'diff3'
import type { MergeDriverCallback } from 'isomorphic-git'

const LINEBREAKS = /^.*(\r?\n|$)/gm

/** When both sides edited the same line differently, keep both (no conflict markers). */
function mergeSameLineConflict(aLine: string, bLine: string): string {
  if (aLine === bLine) return aLine
  if (!aLine.trim()) return bLine
  if (!bLine.trim()) return aLine
  const separator = aLine.endsWith('\n') || !aLine ? '' : '\n'
  return `${aLine}${separator}${bLine}`
}

/**
 * Merge a diff3 conflict hunk. When ancestor lines align with both sides, apply
 * per-line 3-way merge so non-overlapping edits in the same hunk do not repeat base text.
 */
function mergeConflictHunk(aLines: string[], oLines: string[], bLines: string[]): string {
  if (aLines.length === oLines.length && oLines.length === bLines.length) {
    const merged: string[] = []
    for (let i = 0; i < oLines.length; i++) {
      const aLine = aLines[i]
      const oLine = oLines[i]
      const bLine = bLines[i]
      if (aLine === bLine) merged.push(aLine)
      else if (aLine === oLine) merged.push(bLine)
      else if (bLine === oLine) merged.push(aLine)
      else merged.push(mergeSameLineConflict(aLine, bLine))
    }
    return merged.join('')
  }

  const aText = aLines.join('')
  const bText = bLines.join('')
  if (aText === bText) return aText
  if (!aText.trim()) return bText
  if (!bText.trim()) return aText
  return mergeSameLineConflict(aText, bText)
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
      mergedText += mergeConflictHunk(item.conflict.a, item.conflict.o, item.conflict.b)
    }
  }

  return { cleanMerge: true, mergedText }
}
