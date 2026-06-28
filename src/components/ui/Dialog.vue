<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from 'lucide-vue-next'
import Button from './Button.vue'

const open = defineModel<boolean>({ default: false })

defineProps<{
  title?: string
  description?: string
  class?: string
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="open = false"
    >
      <div class="fixed inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        :class="
          cn(
            'relative z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-hidden border bg-background p-6 shadow-lg rounded-lg',
            $props.class,
          )
        "
      >
        <div class="flex shrink-0 flex-col gap-2 pr-8">
          <h2
            v-if="title"
            class="text-lg font-semibold"
          >
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="text-sm text-muted-foreground"
          >
            {{ description }}
          </p>
        </div>
        <div class="min-h-0 overflow-y-auto overscroll-y-contain">
          <slot />
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-4 top-4"
          type="button"
          @click="open = false"
        >
          <X class="size-4" />
        </Button>
      </div>
    </div>
  </Teleport>
</template>
