<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import Button from '@/components/ui/Button.vue'
import { cn } from '@/lib/utils'

const open = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

let confirmed = false

function onOpenChange(value: boolean) {
  open.value = value
  if (!value) {
    if (!confirmed) emit('cancel')
    confirmed = false
  }
}

function onConfirm() {
  confirmed = true
  emit('confirm')
}
</script>

<template>
  <AlertDialogRoot
    :open="open"
    @update:open="onOpenChange"
  >
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-[60] bg-black/50" />
      <AlertDialogContent
        :class="
          cn(
            'fixed top-1/2 left-1/2 z-[60] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
          )
        "
      >
        <AlertDialogTitle class="text-lg font-semibold">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-sm text-muted-foreground">
          {{ description }}
        </AlertDialogDescription>
        <div class="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            as-child
            @click="emit('cancel')"
          >
            <Button
              type="button"
              variant="outline"
            >
              {{ cancelLabel }}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction
            as-child
            @click="onConfirm"
          >
            <Button
              type="button"
              variant="destructive"
            >
              {{ confirmLabel }}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
