<script setup lang="ts">
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'

export type SidebarView = 'files' | 'recent' | 'search'

defineProps<{
  modelValue: SidebarView
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SidebarView]
}>()

const tabs: { id: SidebarView; label: string }[] = [
  { id: 'files', label: 'Files' },
  { id: 'recent', label: 'Recent' },
  { id: 'search', label: 'Search' },
]
</script>

<template>
  <div class="flex items-center gap-1 px-3 pt-3 pb-2">
    <Button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      variant="ghost"
      size="sm"
      :class="cn('h-8 flex-1 px-2 text-sm', modelValue === tab.id && 'bg-muted')"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </Button>
  </div>
</template>
