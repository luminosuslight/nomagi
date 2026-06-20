<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-vue-next'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import Button from '@/components/ui/Button.vue'
import { pdfjs } from '@/lib/pdfjs'

const props = defineProps<{
  data: Uint8Array | null
}>()

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scrollSurfaceStyle = ref<Record<string, string>>({})
const currentPage = ref(1)
const totalPages = ref(0)
const loadError = ref<string | null>(null)
const zoomLevel = ref(1)

const ZOOM_STEP = 0.25
const MIN_ZOOM = 1
const MAX_ZOOM = 3

const pdfDoc = shallowRef<PDFDocumentProxy | null>(null)
const loadingTask = shallowRef<PDFDocumentLoadingTask | null>(null)
let activeRender: { cancel: () => void } | null = null
let renderGeneration = 0

async function renderCurrentPage() {
  const doc = pdfDoc.value
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!doc || !canvas || !container || currentPage.value < 1) return

  const generation = ++renderGeneration
  const page = await doc.getPage(currentPage.value)
  if (generation !== renderGeneration) return

  const unscaled = page.getViewport({ scale: 1 })
  const padding = 16
  const availW = Math.max(container.clientWidth - padding * 2, 1)
  const availH = Math.max(container.clientHeight - padding * 2, 1)
  const fitScale = Math.min(availW / unscaled.width, availH / unscaled.height)
  const scale = fitScale * zoomLevel.value
  const pixelRatio = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: scale * pixelRatio })

  const context = canvas.getContext('2d')
  if (!context) return

  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width / pixelRatio}px`
  canvas.style.height = `${viewport.height / pixelRatio}px`

  const displayW = viewport.width / pixelRatio
  const displayH = viewport.height / pixelRatio
  const surfaceW = Math.max(container.clientWidth, displayW + padding * 2)
  const surfaceH = Math.max(container.clientHeight, displayH + padding * 2)
  scrollSurfaceStyle.value = {
    width: `${surfaceW}px`,
    minWidth: `${surfaceW}px`,
    height: `${surfaceH}px`,
    minHeight: `${surfaceH}px`,
  }

  const task = page.render({ canvasContext: context, viewport, canvas })
  activeRender?.cancel()
  activeRender = task
  try {
    await task.promise
  } catch (err) {
    if (err instanceof Error && err.message.includes('cancel')) return
    throw err
  }
}

async function destroyDocument() {
  renderGeneration++
  activeRender?.cancel()
  const task = loadingTask.value
  loadingTask.value = null
  pdfDoc.value = null
  if (task) await task.destroy()
}

async function loadDocument(data: Uint8Array) {
  loadError.value = null
  await destroyDocument()
  currentPage.value = 1
  totalPages.value = 0
  zoomLevel.value = 1

  try {
    const task = pdfjs.getDocument({ data: data.slice() })
    loadingTask.value = task
    const doc = await task.promise
    pdfDoc.value = doc
    totalPages.value = doc.numPages
    await renderCurrentPage()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load PDF'
  }
}

function navigateToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  zoomLevel.value = 1
  resetScroll()
  currentPage.value = page
}

function goFirst() {
  navigateToPage(1)
}

function goPrev() {
  navigateToPage(currentPage.value - 1)
}

function goNext() {
  navigateToPage(currentPage.value + 1)
}

function goLast() {
  navigateToPage(totalPages.value)
}

function resetScroll() {
  if (!containerRef.value) return
  containerRef.value.scrollTop = 0
  containerRef.value.scrollLeft = 0
}

function zoomIn() {
  zoomLevel.value = Math.min(MAX_ZOOM, zoomLevel.value + ZOOM_STEP)
}

function zoomOut() {
  zoomLevel.value = Math.max(MIN_ZOOM, zoomLevel.value - ZOOM_STEP)
}

function onCanvasClick(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  if (x < rect.width / 3) goPrev()
  else if (x > (rect.width * 2) / 3) goNext()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    goPrev()
  } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault()
    goNext()
  }
}

watch(
  () => props.data,
  (data) => {
    if (data) void loadDocument(data)
    else {
      void destroyDocument()
      totalPages.value = 0
      currentPage.value = 1
    }
  },
  { immediate: true },
)

watch(currentPage, () => {
  resetScroll()
  void renderCurrentPage()
})

watch(zoomLevel, () => {
  resetScroll()
  void renderCurrentPage()
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      void renderCurrentPage()
    })
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  void destroyDocument()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      v-if="totalPages > 0"
      class="flex shrink-0 touch-manipulation items-center justify-center gap-2 border-b px-4 py-2"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="First page"
        :disabled="currentPage <= 1"
        @click="goFirst"
      >
        <ChevronFirst class="size-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="Previous page"
        :disabled="currentPage <= 1"
        @click="goPrev"
      >
        <ChevronLeft class="size-5" />
      </Button>
      <span class="min-w-16 text-center text-base tabular-nums">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="Next page"
        :disabled="currentPage >= totalPages"
        @click="goNext"
      >
        <ChevronRight class="size-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="Last page"
        :disabled="currentPage >= totalPages"
        @click="goLast"
      >
        <ChevronLast class="size-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="Zoom out"
        :disabled="zoomLevel <= MIN_ZOOM"
        @click="zoomOut"
      >
        <Minus class="size-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="size-9 touch-manipulation"
        aria-label="Zoom in"
        :disabled="zoomLevel >= MAX_ZOOM"
        @click="zoomIn"
      >
        <Plus class="size-5" />
      </Button>
    </div>
    <div
      ref="containerRef"
      class="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
    >
      <p
        v-if="loadError"
        class="p-4 text-base text-destructive"
      >
        {{ loadError }}
      </p>
      <div
        v-else
        class="box-border grid touch-pan-x touch-pan-y place-items-center p-4"
        :style="scrollSurfaceStyle"
      >
        <canvas
          ref="canvasRef"
          class="block cursor-pointer touch-manipulation"
          role="img"
          :aria-label="totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'PDF page'"
          @click="onCanvasClick"
        />
      </div>
    </div>
  </div>
</template>
