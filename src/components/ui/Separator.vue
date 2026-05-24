<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()
</script>

<template>
  <div
    role="separator"
    :class="cn('shrink-0 bg-border h-px w-full', $props.class)"
  />
</template>
