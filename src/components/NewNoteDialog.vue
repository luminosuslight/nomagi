<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { FileText, LayoutDashboard } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import NoteFolderSelect from '@/components/NoteFolderSelect.vue'
import type { NoteKind } from '@/lib/noteFilenames'
import { ROOT_FOLDER_VALUE } from '@/lib/noteFolders'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  folders: string[]
  isBusy: boolean
  initialFolder?: string
}>()

const emit = defineEmits<{
  create: [payload: { name?: string; folder: string; kind: NoteKind }]
}>()

const folder = ref(ROOT_FOLDER_VALUE)
const name = ref('')
const kind = ref<NoteKind>('markdown')
const nameInputRef = ref<InstanceType<typeof Input> | null>(null)

const isQuickNote = computed(() => folder.value === ROOT_FOLDER_VALUE && !name.value.trim())

const submitLabel = computed(() => {
  if (!isQuickNote.value) return 'Create'
  return kind.value === 'canvas' ? 'Quick Whiteboard' : 'Quick Note'
})

const kindOptions: { value: NoteKind; label: string; icon: typeof FileText }[] = [
  { value: 'markdown', label: 'Note', icon: FileText },
  { value: 'canvas', label: 'Whiteboard', icon: LayoutDashboard },
]

watch(open, async (isOpen) => {
  if (!isOpen) return
  folder.value = props.initialFolder ?? ROOT_FOLDER_VALUE
  name.value = ''
  kind.value = 'markdown'
  await nextTick()
  ;(nameInputRef.value?.$el as HTMLInputElement | undefined)?.focus()
})

function onSubmit() {
  emit('create', {
    folder: folder.value,
    name: name.value.trim() || undefined,
    kind: kind.value,
  })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model="open"
    title="New note"
    description="No Folder / Quick Note saves named notes at the repo root and untitled notes in quick_notes. Other folders use the path you select."
  >
    <form
      class="grid gap-4"
      @submit.prevent="onSubmit"
    >
      <div
        class="grid grid-cols-2 gap-1 rounded-md border p-0.5"
        role="radiogroup"
        aria-label="Note type"
      >
        <Button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          variant="ghost"
          size="sm"
          role="radio"
          :aria-checked="kind === option.value"
          :class="kind === option.value && 'bg-accent text-accent-foreground'"
          :disabled="isBusy"
          @click="kind = option.value"
        >
          <component
            :is="option.icon"
            class="size-4"
          />
          {{ option.label }}
        </Button>
      </div>
      <NoteFolderSelect
        id="new-note-folder"
        v-model="folder"
        :folders="folders"
        :disabled="isBusy"
      />
      <div class="grid gap-2">
        <Label for="new-note-name">Filename</Label>
        <Input
          id="new-note-name"
          ref="nameInputRef"
          v-model="name"
          type="text"
          placeholder="Optional"
          class="text-base"
          :disabled="isBusy"
        />
      </div>
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
          :disabled="isBusy"
        >
          {{ submitLabel }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
