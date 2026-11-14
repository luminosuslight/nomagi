import type { InjectionKey, Ref } from 'vue'
import type { CanvasNode } from '@/lib/canvas/jsonCanvas'

/** Vue Flow `data` of every canvas node. */
export type CanvasFlowNodeData = { node: CanvasNode }

export type CanvasEditorContext = {
  /** Repo path of the open `.canvas` file. */
  filename: Ref<string>
  /** Node whose content is being edited (text, file note or group label). */
  editingId: Ref<string | null>
  startEditing: (id: string) => void
  stopEditing: () => void
  /** Merge `patch` into the node and save the canvas. */
  patchNode: (id: string, patch: Partial<CanvasNode>) => void
  /** Persist the node's on-screen position and size (after a resize). */
  commitGeometry: (id: string) => void
  deleteNode: (id: string) => void
  /** Blob URL for an image file in the repo (root-relative path); rejects when missing. */
  resolveRepoImage: (path: string) => Promise<string>
  readFile: (filepath: string) => Promise<string>
  readFileBinary?: (filepath: string) => Promise<Uint8Array>
  writeFile: (filepath: string, content: string) => Promise<void>
  createBinaryFile?: (filepath: string, bytes: Uint8Array) => Promise<string>
  openFile: (filepath: string) => void
}

export const canvasEditorKey: InjectionKey<CanvasEditorContext> = Symbol('canvasEditor')
