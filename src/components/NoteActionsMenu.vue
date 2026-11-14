<script setup lang="ts">
import { FolderInput, MoreHorizontal, Pencil, Trash2 } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'

defineProps<{
  disabled?: boolean
  renameDisabled?: boolean
  moveDisabled?: boolean
  deleteDisabled?: boolean
}>()

defineEmits<{
  rename: []
  move: []
  delete: []
}>()

const itemClass =
  'flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-disabled:opacity-40 data-highlighted:bg-neutral-100'
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0 text-neutral-500"
        aria-label="Note actions"
        :disabled="disabled"
      >
        <MoreHorizontal class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <!-- Returning focus to the trigger on close would blur the rename input. -->
      <DropdownMenuContent
        align="end"
        :side-offset="4"
        class="z-50 min-w-44 rounded-xl border border-neutral-200/80 bg-white p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        @close-auto-focus="(event: Event) => event.preventDefault()"
      >
        <DropdownMenuItem
          :class="itemClass"
          :disabled="renameDisabled"
          @select="$emit('rename')"
        >
          <Pencil class="size-4 text-neutral-500" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="itemClass"
          :disabled="moveDisabled"
          @select="$emit('move')"
        >
          <FolderInput class="size-4 text-neutral-500" />
          Move to folder…
        </DropdownMenuItem>
        <DropdownMenuSeparator class="my-1 h-px bg-neutral-100" />
        <DropdownMenuItem
          :class="cn(itemClass, 'text-red-600 data-highlighted:bg-red-50')"
          :disabled="deleteDisabled"
          @select="$emit('delete')"
        >
          <Trash2 class="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
