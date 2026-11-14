import type { MergeDriverCallback } from 'isomorphic-git'
import { mergeCanvasText } from '@/lib/canvas/canvasMerge'
import { isCanvasFile } from '@/lib/fileTypes'
import { mergeText } from '@/lib/textMerge'

/**
 * Notes merge driver: diff3 when edits don't overlap; on conflict, keep both
 * sides so nothing is lost (user can trim the result manually).
 * Binary PDFs use simple 3-way resolution (prefer the side that changed).
 * Canvas files are merged structurally so the result stays valid JSON.
 */
export const notesMergeDriver: MergeDriverCallback = (args) => {
  const { contents } = args
  const filepath =
    'filepath' in args && typeof args.filepath === 'string'
      ? args.filepath
      : 'path' in args && typeof (args as { path?: string }).path === 'string'
        ? (args as { path: string }).path
        : ''
  const baseContent = contents[0]
  const ourContent = contents[1]
  const theirContent = contents[2]

  if (ourContent === theirContent) {
    return { cleanMerge: true, mergedText: ourContent }
  }

  if (filepath.toLowerCase().endsWith('.pdf')) {
    if (ourContent === baseContent) {
      return { cleanMerge: true, mergedText: theirContent }
    }
    if (theirContent === baseContent) {
      return { cleanMerge: true, mergedText: ourContent }
    }
    return { cleanMerge: true, mergedText: theirContent }
  }

  if (isCanvasFile(filepath)) {
    return { cleanMerge: true, mergedText: mergeCanvasText(baseContent, ourContent, theirContent) }
  }

  return { cleanMerge: true, mergedText: mergeText(baseContent, ourContent, theirContent) }
}
