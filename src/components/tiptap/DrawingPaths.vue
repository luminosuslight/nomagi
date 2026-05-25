<script setup lang="ts">
import type { DrawingLine } from '@/lib/tiptap/drawingTypes'

defineProps<{
  lines: DrawingLine[]
  excludeId?: string
  interactive?: boolean
}>()
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
      :stroke="item.color"
      :stroke-width="item.size"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
  </template>
</template>
