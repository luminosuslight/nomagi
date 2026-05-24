<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
  placeholder?: string
  modelValue?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <textarea
    :placeholder="placeholder"
    :disabled="disabled"
    :value="modelValue"
    :class="
      cn(
        'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        $props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
