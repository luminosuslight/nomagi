<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import { ROOT_FOLDER_LABEL, ROOT_FOLDER_VALUE } from '@/lib/noteFolders'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  folders: string[]
  isBusy: boolean
}>()

const emit = defineEmits<{
  create: [payload: { name?: string; folder: string }]
}>()

const folder = ref(ROOT_FOLDER_VALUE)
const name = ref('')
const nameInputRef = ref<InstanceType<typeof Input> | null>(null)

const folderOptions = computed(() => [
  { value: ROOT_FOLDER_VALUE, label: ROOT_FOLDER_LABEL },
  ...props.folders.map((path) => ({ value: path, label: path })),
])

const isQuickNote = computed(() => folder.value === ROOT_FOLDER_VALUE && !name.value.trim())

const submitLabel = computed(() => (isQuickNote.value ? 'Quick Note' : 'Create'))

watch(open, async (isOpen) => {
  if (!isOpen) return
  folder.value = ROOT_FOLDER_VALUE
  name.value = ''
  await nextTick()
  ;(nameInputRef.value?.$el as HTMLInputElement | undefined)?.focus()
})

function onSubmit() {
  emit('create', {
    folder: folder.value,
    name: name.value.trim() || undefined,
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
      <div class="grid gap-2">
        <Label for="new-note-folder">Folder</Label>
        <select
          id="new-note-folder"
          v-model="folder"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="isBusy"
        >
          <option
            v-for="option in folderOptions"
            :key="option.value || 'root'"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
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
