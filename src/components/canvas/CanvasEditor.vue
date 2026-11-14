<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, toRef, watch } from 'vue'
import {
  Panel,
  VueFlow,
  useVueFlow,
  type Dimensions,
  type Node,
  type NodeChange,
  type NodeDragEvent,
  type XYPosition,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { FileText, Frame, ImagePlus, Maximize, StickyNote, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import CanvasFileDialog from '@/components/canvas/CanvasFileDialog.vue'
import CanvasImageDialog from '@/components/canvas/CanvasImageDialog.vue'
import CanvasNodeView from '@/components/canvas/CanvasNodeView.vue'
import Button from '@/components/ui/Button.vue'
import {
  canvasEditorKey,
  type CanvasEditorContext,
  type CanvasFlowNodeData,
} from '@/lib/canvas/canvasEditorContext'
import {
  createCanvasId,
  isGroupNode,
  isTextNode,
  parseCanvas,
  serializeCanvas,
  type CanvasDocument,
  type CanvasNode,
} from '@/lib/canvas/jsonCanvas'
import { errorMessage, reportError } from '@/lib/errors'
import { isMarkdownFile } from '@/lib/fileTypes'
import { createRepoImageResolver } from '@/lib/milkdown/images'
import { imageMimeType, resolveRepoImagePath } from '@/lib/milkdown/images/imageUrls'
import { savePastedImage } from '@/lib/pastedImages'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'

const TEXT_NODE_SIZE = { width: 260, height: 160 }
const GROUP_NODE_SIZE = { width: 480, height: 320 }
const NOTE_FILE_NODE_SIZE = { width: 400, height: 400 }
const OTHER_FILE_NODE_SIZE = { width: 320, height: 72 }
const MAX_IMAGE_SIDE = 400
const MIN_IMAGE_SIDE = 40
/** Groups always render below content; within each layer the file order is the z-order. */
const CONTENT_Z_OFFSET = 100_000

const props = defineProps<{
  modelValue: string
  filename: string
  files: string[]
  readFile: (filepath: string) => Promise<string>
  writeFile: (filepath: string, content: string) => Promise<void>
  readFileBinary?: (filepath: string) => Promise<Uint8Array>
  createBinaryFile?: (filepath: string, bytes: Uint8Array) => Promise<string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  openFile: [filepath: string]
}>()

const flowId = `canvas-${createCanvasId()}`
const {
  nodes: flowNodes,
  addNodes,
  addSelectedNodes,
  findNode,
  fitView,
  getSelectedNodes,
  removeNodes,
  removeSelectedNodes,
  screenToFlowCoordinate,
  setNodes,
  setViewport,
  updateNode,
  viewport,
  zoomIn,
  zoomOut,
} = useVueFlow(flowId)

const containerRef = ref<HTMLElement | null>(null)
const parseError = ref<string | null>(null)
const editingId = ref<string | null>(null)
const imageDialogOpen = ref(false)
const fileDialogOpen = ref(false)

let doc: CanvasDocument | null = null
let lastEmitted: string | null = null
/** A note created by the toolbar is dropped again if it is left empty. */
let freshNodeId: string | null = null
let editingStoppedAt = 0
let fittedOnce = false

const otherFiles = computed(() => props.files.filter((path) => path !== props.filename))

const imageResolver = props.readFileBinary
  ? createRepoImageResolver(() => props.filename, props.readFileBinary)
  : null

onUnmounted(() => imageResolver?.dispose())

function toFlowNode(node: CanvasNode, index: number): Node<CanvasFlowNodeData> {
  const group = isGroupNode(node)
  return {
    id: node.id,
    type: 'canvas',
    position: { x: node.x, y: node.y },
    style: { width: `${node.width}px`, height: `${node.height}px` },
    data: { node },
    zIndex: group ? index : CONTENT_Z_OFFSET + index,
    class: group ? 'canvas-flow-group' : undefined,
    dragHandle: group ? '.canvas-group-label' : undefined,
  }
}

function load(text: string) {
  try {
    doc = parseCanvas(text)
    parseError.value = null
  } catch (err) {
    doc = null
    parseError.value = errorMessage(err)
    setNodes([])
    return
  }
  setNodes(doc.nodes.map(toFlowNode))
  if (editingId.value && !doc.nodes.some((node) => node.id === editingId.value)) {
    editingId.value = null
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmitted) return
    load(value)
  },
  { immediate: true },
)

function save() {
  if (!doc) return
  lastEmitted = serializeCanvas(doc)
  emit('update:modelValue', lastEmitted)
}

function nodeIndex(id: string): number {
  return doc ? doc.nodes.findIndex((node) => node.id === id) : -1
}

function replaceNode(id: string, patch: Partial<CanvasNode>): CanvasNode | null {
  const index = nodeIndex(id)
  if (!doc || index === -1) return null
  const next = { ...doc.nodes[index], ...patch } as CanvasNode
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key]
  }
  doc.nodes[index] = next
  return next
}

function patchNode(id: string, patch: Partial<CanvasNode>) {
  const next = replaceNode(id, patch)
  if (!next) return
  updateNode(id, { data: { node: next } })
  save()
}

function geometryOf(position: XYPosition, dimensions?: Dimensions): Partial<CanvasNode> {
  const geometry: Partial<CanvasNode> = { x: Math.round(position.x), y: Math.round(position.y) }
  if (dimensions?.width && dimensions?.height) {
    geometry.width = Math.round(dimensions.width)
    geometry.height = Math.round(dimensions.height)
  }
  return geometry
}

function commitGeometry(id: string) {
  const flowNode = findNode(id)
  if (!flowNode) return
  replaceNode(id, geometryOf(flowNode.position, flowNode.dimensions))
  save()
}

function deleteNode(id: string) {
  removeNodes([id])
}

function onNodesChange(changes: NodeChange[]) {
  if (!doc) return
  const removed = new Set(changes.filter((change) => change.type === 'remove').map((c) => c.id))
  if (removed.size === 0) return
  doc.nodes = doc.nodes.filter((node) => !removed.has(node.id))
  doc.edges = doc.edges.filter((edge) => !removed.has(edge.fromNode) && !removed.has(edge.toNode))
  if (editingId.value && removed.has(editingId.value)) editingId.value = null
  save()
}

function isInside(inner: CanvasNode, outer: CanvasNode): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

type GroupMember = { id: string; groupId: string; start: XYPosition }

/** Dragging a group moves everything fully inside it (JSON Canvas groups are purely spatial). */
let groupDrag: { groupStarts: Map<string, XYPosition>; members: GroupMember[] } | null = null

function onDragStart({ nodes }: NodeDragEvent) {
  groupDrag = null
  if (!doc) return
  const dragged = new Set(nodes.map((node) => node.id))
  const groups = doc.nodes.filter((node) => isGroupNode(node) && dragged.has(node.id))
  if (groups.length === 0) return

  const members: GroupMember[] = []
  const claimed = new Set<string>()
  for (const group of groups) {
    for (const node of doc.nodes) {
      if (dragged.has(node.id) || claimed.has(node.id) || node.id === group.id) continue
      if (!isInside(node, group)) continue
      claimed.add(node.id)
      members.push({ id: node.id, groupId: group.id, start: { x: node.x, y: node.y } })
    }
  }
  groupDrag = {
    groupStarts: new Map(groups.map((group) => [group.id, { x: group.x, y: group.y }])),
    members,
  }
}

function onDrag() {
  if (!groupDrag) return
  for (const member of groupDrag.members) {
    const group = findNode(member.groupId)
    const groupStart = groupDrag.groupStarts.get(member.groupId)
    if (!group || !groupStart) continue
    updateNode(member.id, {
      position: {
        x: member.start.x + group.position.x - groupStart.x,
        y: member.start.y + group.position.y - groupStart.y,
      },
    })
  }
}

function onDragStop({ nodes }: NodeDragEvent) {
  const ids = [...nodes.map((node) => node.id), ...(groupDrag?.members.map((m) => m.id) ?? [])]
  groupDrag = null
  for (const id of ids) {
    const flowNode = findNode(id)
    if (flowNode) replaceNode(id, geometryOf(flowNode.position))
  }
  save()
}

function containerRect(): DOMRect | null {
  return containerRef.value?.getBoundingClientRect() ?? null
}

function visibleCenter(): XYPosition {
  const rect = containerRect()
  if (!rect) return { x: 0, y: 0 }
  return screenToFlowCoordinate({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
}

/** Top-left corner for a new node centered on `center`, nudged so it does not hide another. */
function placement(size: { width: number; height: number }, center = visibleCenter()) {
  let x = Math.round(center.x - size.width / 2)
  let y = Math.round(center.y - size.height / 2)
  while (doc?.nodes.some((node) => Math.abs(node.x - x) < 8 && Math.abs(node.y - y) < 8)) {
    x += 24
    y += 24
  }
  return { x, y, ...size }
}

function selectOnly(id: string) {
  removeSelectedNodes(getSelectedNodes.value)
  const flowNode = findNode(id)
  if (flowNode) addSelectedNodes([flowNode])
}

/** Vue Flow keeps nodes hidden until measured, and hidden elements cannot take focus. */
async function waitUntilMeasured(id: string) {
  for (let frame = 0; frame < 30; frame++) {
    if (findNode(id)?.dimensions.width) return
    await new Promise(requestAnimationFrame)
  }
}

async function insertNode(node: CanvasNode, options: { edit?: boolean } = {}) {
  if (!doc) return
  doc.nodes.push(node)
  addNodes(toFlowNode(node, doc.nodes.length - 1))
  save()
  await nextTick()
  await waitUntilMeasured(node.id)
  selectOnly(node.id)
  if (options.edit) {
    startEditing(node.id)
    freshNodeId = node.id
  }
}

function addTextNode(center?: XYPosition) {
  void insertNode(
    { id: createCanvasId(), type: 'text', text: '', ...placement(TEXT_NODE_SIZE, center) },
    { edit: true },
  )
}

function addGroupNode() {
  void insertNode(
    { id: createCanvasId(), type: 'group', label: 'Frame', ...placement(GROUP_NODE_SIZE) },
    { edit: true },
  )
}

function addFileNode(filepath: string) {
  const size = isMarkdownFile(filepath) ? NOTE_FILE_NODE_SIZE : OTHER_FILE_NODE_SIZE
  void insertNode({ id: createCanvasId(), type: 'file', file: filepath, ...placement(size) })
}

function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image
      const scale = Math.max(
        Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height)),
        MIN_IMAGE_SIDE / Math.min(width, height),
      )
      resolve({ width: Math.round(width * scale), height: Math.round(height * scale) })
    }
    image.onerror = () => resolve({ width: 320, height: 240 })
    image.src = src
  })
}

async function resolveRepoImage(path: string): Promise<string> {
  if (!imageResolver) throw new Error('Images are not available')
  const src = `/${path}`
  const url = await imageResolver.resolve(src)
  if (url === src) throw new Error(`${path} not found`)
  return url
}

async function addImage(source: { src: string } | { file: File }) {
  try {
    if ('file' in source) {
      if (!props.createBinaryFile) return
      const saved = await savePastedImage(source.file, props.createBinaryFile)
      const file = saved.replace(/^\/+/, '')
      const size = await imageSize(await resolveRepoImage(file))
      await insertNode({ id: createCanvasId(), type: 'file', file, ...placement(size) })
      return
    }

    if (/^https?:\/\//i.test(source.src)) {
      const size = await imageSize(source.src)
      await insertNode({ id: createCanvasId(), type: 'link', url: source.src, ...placement(size) })
      return
    }

    const file = resolveRepoImagePath('', `/${source.src.replace(/^\/+/, '')}`)
    if (!file || !imageMimeType(file)) throw new Error('Not an image path')
    const size = await imageSize(await resolveRepoImage(file))
    await insertNode({ id: createCanvasId(), type: 'file', file, ...placement(size) })
  } catch (err) {
    reportError('canvas add image', err)
    toast.error(`Could not add image: ${errorMessage(err)}`)
  }
}

/** Editing needs zoom 1: editor menus are positioned in screen pixels and text must be legible. */
function bringIntoView(id: string) {
  const flowNode = findNode(id)
  const rect = containerRect()
  if (!flowNode || !rect) return
  const { zoom, x: vx, y: vy } = viewport.value
  const { width, height } = flowNode.dimensions
  const left = flowNode.position.x * zoom + vx
  const top = flowNode.position.y * zoom + vy
  const visible =
    left >= 0 && top >= 0 && left + width * zoom <= rect.width && top + height * zoom <= rect.height
  if (Math.abs(zoom - 1) < 0.05 && visible) return

  const margin = 64
  const x =
    width + margin > rect.width
      ? margin / 2 - flowNode.position.x
      : rect.width / 2 - (flowNode.position.x + width / 2)
  const y =
    height + margin * 2 > rect.height
      ? margin - flowNode.position.y
      : rect.height / 2 - (flowNode.position.y + height / 2)
  void setViewport({ x, y, zoom: 1 }, { duration: 200 })
}

function startEditing(id: string) {
  if (editingId.value && editingId.value !== id) stopEditing()
  const node = doc?.nodes[nodeIndex(id)]
  editingId.value = id
  if (node && !isGroupNode(node)) bringIntoView(id)
}

function stopEditing() {
  const id = editingId.value
  if (!id) return
  editingId.value = null
  editingStoppedAt = Date.now()
  if (id === freshNodeId) {
    const node = doc?.nodes[nodeIndex(id)]
    if (node && isTextNode(node) && !node.text.trim()) removeNodes([id])
  }
  freshNodeId = null
}

function onPaneClick(event: MouseEvent) {
  if (editingId.value) {
    stopEditing()
    return
  }
  if (event.detail >= 2 && Date.now() - editingStoppedAt > 600) {
    addTextNode(screenToFlowCoordinate({ x: event.clientX, y: event.clientY }))
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && editingId.value) {
    event.preventDefault()
    stopEditing()
  }
}

function onNodesInitialized() {
  if (fittedOnce) return
  fittedOnce = true
  void fitView({ padding: 0.15, maxZoom: 1 })
}

function fitAll() {
  void fitView({ padding: 0.15, maxZoom: 1, duration: 200 })
}

/** Safari fires its own pinch gestures; without this, pinching zooms the page instead of the canvas. */
function preventGesture(event: Event) {
  event.preventDefault()
}

onMounted(() => {
  const el = containerRef.value
  el?.addEventListener('gesturestart', preventGesture)
  el?.addEventListener('gesturechange', preventGesture)
})

onUnmounted(() => {
  const el = containerRef.value
  el?.removeEventListener('gesturestart', preventGesture)
  el?.removeEventListener('gesturechange', preventGesture)
})

const context: CanvasEditorContext = {
  filename: toRef(props, 'filename'),
  editingId,
  startEditing,
  stopEditing,
  patchNode,
  commitGeometry,
  deleteNode,
  resolveRepoImage,
  readFile: (filepath) => props.readFile(filepath),
  readFileBinary: props.readFileBinary,
  writeFile: (filepath, content) => props.writeFile(filepath, content),
  createBinaryFile: props.createBinaryFile,
  openFile: (filepath) => emit('openFile', filepath),
}

provide(canvasEditorKey, context)

const isEmpty = computed(() => flowNodes.value.length === 0)
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-editor absolute inset-0"
    @keydown="onKeydown"
  >
    <div
      v-if="parseError"
      class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <p class="font-medium">
        This whiteboard file could not be read.
      </p>
      <p class="max-w-md text-sm text-muted-foreground">
        {{ parseError }}. Switch to the source view to fix the JSON.
      </p>
    </div>
    <VueFlow
      v-else
      :id="flowId"
      class="canvas-flow"
      :min-zoom="0.1"
      :max-zoom="4"
      :zoom-on-double-click="false"
      :zoom-on-pinch="true"
      :pan-on-scroll="true"
      :pan-on-drag="true"
      :nodes-connectable="false"
      :elevate-nodes-on-select="false"
      :node-drag-threshold="3"
      :delete-key-code="['Backspace', 'Delete']"
      @nodes-change="onNodesChange"
      @node-drag-start="onDragStart"
      @node-drag="onDrag"
      @node-drag-stop="onDragStop"
      @selection-drag-start="onDragStart"
      @selection-drag="onDrag"
      @selection-drag-stop="onDragStop"
      @pane-click="onPaneClick"
      @nodes-initialized="onNodesInitialized"
    >
      <template #node-canvas="nodeProps">
        <CanvasNodeView v-bind="nodeProps" />
      </template>

      <Background
        :gap="24"
        :size="1.5"
        pattern-color="#d4d4d4"
      />

      <Panel position="top-left">
        <div class="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9"
            aria-label="Add note"
            @click="addTextNode()"
          >
            <StickyNote class="size-4" />
            <span class="hidden sm:inline">Note</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9"
            aria-label="Add image"
            @click="imageDialogOpen = true"
          >
            <ImagePlus class="size-4" />
            <span class="hidden sm:inline">Image</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9"
            aria-label="Embed note"
            @click="fileDialogOpen = true"
          >
            <FileText class="size-4" />
            <span class="hidden sm:inline">Embed</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9"
            aria-label="Add frame"
            @click="addGroupNode"
          >
            <Frame class="size-4" />
            <span class="hidden sm:inline">Frame</span>
          </Button>
        </div>
      </Panel>

      <Panel position="bottom-right">
        <div class="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            @click="zoomOut({ duration: 150 })"
          >
            <ZoomOut class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            @click="zoomIn({ duration: 150 })"
          >
            <ZoomIn class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fit to screen"
            @click="fitAll"
          >
            <Maximize class="size-4" />
          </Button>
        </div>
      </Panel>
    </VueFlow>

    <div
      v-if="!parseError && isEmpty"
      class="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
    >
      Empty whiteboard. Add a note, image or frame from the toolbar, or double-click the canvas.
    </div>

    <CanvasImageDialog
      v-model="imageDialogOpen"
      :can-upload="Boolean(createBinaryFile)"
      @add="addImage"
    />
    <CanvasFileDialog
      v-model="fileDialogOpen"
      :files="otherFiles"
      @add="addFileNode"
    />
  </div>
</template>

<style>
.canvas-flow {
  touch-action: none;
  overscroll-behavior: none;
  background: var(--color-neutral-50);
}

/* Group bodies let pointer events through so panning works inside frames; only the label drags.
   !important is needed because Vue Flow sets pointer-events inline on every node. */
.canvas-flow .vue-flow__node.canvas-flow-group {
  pointer-events: none !important;
}

.canvas-flow .vue-flow__node.canvas-flow-group .canvas-group-label,
.canvas-flow .vue-flow__node.canvas-flow-group .vue-flow__resize-control {
  pointer-events: auto;
}

.canvas-flow .vue-flow__node.draggable,
.canvas-flow .vue-flow__node.canvas-flow-group .canvas-group-label {
  cursor: move;
}

.canvas-flow .vue-flow__node.canvas-flow-group .canvas-group-label input {
  cursor: text;
}

.canvas-flow .vue-flow__node:focus-visible {
  outline: none;
}

.canvas-flow .canvas-node-editing {
  touch-action: auto;
  user-select: text;
  -webkit-user-select: text;
}
</style>
