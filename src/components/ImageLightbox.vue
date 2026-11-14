<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

export interface LightboxImage {
  src: string
  caption: string
}

const props = defineProps<{
  images: LightboxImage[]
}>()

/** Index of the shown image; null when closed. */
const index = defineModel<number | null>({ default: null })

const SWIPE_THRESHOLD_PX = 50

const current = computed(() => (index.value === null ? null : props.images[index.value]))
const hasMultiple = computed(() => props.images.length > 1)

function close() {
  index.value = null
}

function step(delta: number) {
  if (index.value === null || !hasMultiple.value) return
  const count = props.images.length
  index.value = (index.value + delta + count) % count
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === 'ArrowRight') step(1)
}

let touchStartX: number | null = null

function onTouchStart(event: TouchEvent) {
  touchStartX = event.touches.length === 1 ? event.touches[0]!.clientX : null
}

function onTouchEnd(event: TouchEvent) {
  if (touchStartX === null) return
  const deltaX = event.changedTouches[0]!.clientX - touchStartX
  touchStartX = null
  if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) step(deltaX < 0 ? 1 : -1)
}
</script>

<template>
  <DialogRoot
    :open="current !== null"
    @update:open="(open) => !open && close()"
  >
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm" />
      <DialogContent
        class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 outline-none sm:p-8"
        :aria-describedby="undefined"
        @keydown="onKeydown"
        @click.self="close"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <DialogTitle class="sr-only">
          {{ current?.caption || 'Image' }}
        </DialogTitle>
        <img
          v-if="current"
          :key="current.src"
          :src="current.src"
          :alt="current.caption"
          class="max-h-[calc(100dvh-7rem)] max-w-full select-none rounded object-contain shadow-2xl"
          draggable="false"
        >
        <p
          v-if="current?.caption || hasMultiple"
          class="max-w-full truncate text-center text-sm text-white/80"
        >
          <span v-if="hasMultiple">{{ (index ?? 0) + 1 }} / {{ images.length }}</span>
          <span v-if="current?.caption && hasMultiple"> · </span>
          <span v-if="current?.caption">{{ current.caption }}</span>
        </p>
        <button
          type="button"
          class="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Close"
          @click="close"
        >
          <X class="size-6" />
        </button>
        <template v-if="hasMultiple">
          <button
            type="button"
            class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Previous image"
            @click="step(-1)"
          >
            <ChevronLeft class="size-6" />
          </button>
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Next image"
            @click="step(1)"
          >
            <ChevronRight class="size-6" />
          </button>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
