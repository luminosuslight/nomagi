<script setup lang="ts">
import { computed } from 'vue'
import { Circle, CircleCheck, Image, PenLine } from 'lucide-vue-next'
import { formatNoteDate } from '@/lib/formatNoteDate'
import { displayFilename, highlightParts, noteFolder, parsePreviewLine } from '@/lib/noteDisplay'
import { cn } from '@/lib/utils'

const props = defineProps<{
  filepath: string
  preview: string
  lastModified?: number
  selected?: boolean
  highlight?: string
  /** Line clamp for the preview, e.g. `line-clamp-3`. */
  clampClass: string
}>()

defineEmits<{
  select: []
}>()

const title = computed(() => displayFilename(props.filepath))

const lines = computed(() => {
  const lines = props.preview.split('\n')
  const firstLine = lines[0]?.replace(/^\*\*(.*)\*\*$/, '$1').toLowerCase()
  if (title.value && firstLine === title.value.toLowerCase()) lines.shift()
  return lines.map(parsePreviewLine)
})

const footer = computed(() =>
  [formatNoteDate(props.lastModified ?? 0), noteFolder(props.filepath)].filter(Boolean).join(' · '),
)
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'flex w-full flex-col gap-1 rounded-xl border border-neutral-200/80 bg-white p-3 text-left shadow-xs outline-none transition-colors hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-ring/40',
        selected && 'border-neutral-400 hover:border-neutral-400',
      )
    "
    @click="$emit('select')"
  >
    <span
      v-if="title"
      class="truncate text-sm font-semibold"
    >{{ title }}</span>
    <span
      v-if="lines.length"
      :class="cn('text-xs leading-relaxed break-words text-neutral-600', clampClass)"
    >
      <span
        v-for="(line, lineIndex) in lines"
        :key="lineIndex"
        :class="cn('block', line.marker === 'done' && 'text-neutral-400 line-through')"
      >
        <Circle
          v-if="line.marker === 'todo'"
          class="mr-1 inline size-3 align-[-2px] text-neutral-400"
        />
        <CircleCheck
          v-else-if="line.marker === 'done'"
          class="mr-1 inline size-3 align-[-2px]"
        />
        <span
          v-else-if="line.marker === 'bullet'"
          class="mr-1 text-neutral-400"
        >•</span>
        <template
          v-for="(segment, segmentIndex) in line.segments"
          :key="segmentIndex"
        >
          <span
            v-if="segment.media"
            class="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 align-[-1px] text-neutral-500"
          >
            <Image
              v-if="segment.media === 'image'"
              class="size-3"
            />
            <PenLine
              v-else
              class="size-3"
            />
            {{ segment.text }}
          </span>
          <span
            v-else
            :class="segment.bold && 'font-semibold text-neutral-800'"
          >
            <template
              v-for="(part, partIndex) in highlightParts(segment.text, highlight)"
              :key="partIndex"
            >
              <mark
                v-if="part.match"
                class="rounded-sm bg-amber-200/70 text-inherit"
              >{{
                part.text
              }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
        </template>
      </span>
    </span>
    <span
      v-if="footer"
      class="truncate text-[11px] text-neutral-400"
    >{{ footer }}</span>
  </button>
</template>
