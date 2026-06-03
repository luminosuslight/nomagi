<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Label from '@/components/ui/Label.vue'
import NoteFolderSelect from '@/components/NoteFolderSelect.vue'
import { noteParentFolder } from '@/lib/noteFolders'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  filepath: string | null
  folders: string[]
  isBusy: boolean
}>()

const emit = defineEmits<{
  move: [payload: { folder: string }]
}>()

const folder = ref('')

const currentFolderLabel = computed(() => {
  if (!props.filepath) return '—'
  const parent = noteParentFolder(props.filepath)
  return parent || 'Root'
})

const canMove = computed(() =>
  Boolean(props.filepath && folder.value !== noteParentFolder(props.filepath)),
)

watch(open, (isOpen) => {
  if (!isOpen || !props.filepath) return
  folder.value = noteParentFolder(props.filepath)
})

function onSubmit() {
  if (!canMove.value) return
  emit('move', { folder: folder.value })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model="open"
    title="Move note"
  >
    <form
      class="grid gap-4"
      @submit.prevent="onSubmit"
    >
      <div class="grid gap-2">
        <Label>Current folder</Label>
        <p class="text-base text-muted-foreground">
          {{ currentFolderLabel }}
        </p>
      </div>
      <NoteFolderSelect
        id="move-note-folder"
        v-model="folder"
        root-label="Root"
        :folders="folders"
        :disabled="isBusy || !filepath"
      />
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="isBusy"
          @click="open = false"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          :disabled="isBusy || !canMove"
        >
          Move
        </Button>
      </div>
    </form>
  </Dialog>
</template>
