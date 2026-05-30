<script setup lang="ts">
import { computed } from 'vue'
import type { ToasterProps } from 'vue-sonner'
import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert, X } from 'lucide-vue-next'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/lib/utils'

const props = defineProps<ToasterProps>()

const toasterProps = computed(() => {
  const rest = { ...props } as Record<string, unknown>
  delete rest.toastOptions
  delete rest.class
  return rest as typeof props
})

const toastOptions = computed(() => ({
  classes: {
    toast:
      'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
    description: 'group-[.toast]:text-muted-foreground',
    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
    ...props.toastOptions?.classes,
  },
  ...props.toastOptions,
}))
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="toasterProps"
    :toast-options="toastOptions"
  >
    <template #success-icon>
      <CircleCheck class="size-4" />
    </template>
    <template #info-icon>
      <Info class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlert class="size-4" />
    </template>
    <template #error-icon>
      <OctagonX class="size-4" />
    </template>
    <template #loading-icon>
      <Loader2 class="size-4 animate-spin" />
    </template>
    <template #close-icon>
      <X class="size-4" />
    </template>
  </Sonner>
</template>
