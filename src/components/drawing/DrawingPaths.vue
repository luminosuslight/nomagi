<script setup lang="ts">
import type { DrawingLine } from '@/lib/drawing/drawingTypes'

defineProps<{
  lines: DrawingLine[]
  excludeId?: string
  interactive?: boolean
}>()

function isAdvanced(line: DrawingLine) {
  return (line.mode ?? 'simple') === 'advanced'
}
</script>

<template>
  <rect
    width="500"
    height="250"
    fill="transparent"
    :pointer-events="interactive ? 'all' : 'none'"
  />
  <template
    v-for="item in lines"
    :key="item.id"
  >
    <path
      v-if="item.id !== excludeId"
      :id="`id-${item.id}`"
      :d="item.path"
      :stroke="isAdvanced(item) ? 'none' : item.color"
      :stroke-width="isAdvanced(item) ? undefined : item.size"
      :fill="isAdvanced(item) ? item.color : 'none'"
      :stroke-linecap="isAdvanced(item) ? undefined : 'round'"
      :stroke-linejoin="isAdvanced(item) ? undefined : 'round'"
      :data-mode="isAdvanced(item) ? 'advanced' : undefined"
      pointer-events="none"
    />
  </template>
</template>
