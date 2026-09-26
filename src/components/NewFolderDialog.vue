<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import NoteFolderSelect from '@/components/NoteFolderSelect.vue'
import { ROOT_FOLDER_VALUE } from '@/lib/noteFolders'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  folders: string[]
  isBusy: boolean
  initialFolder?: string
}>()

const emit = defineEmits<{
  create: [payload: { name: string; folder: string }]
}>()

const folder = ref(ROOT_FOLDER_VALUE)
const name = ref('')
const nameInputRef = ref<InstanceType<typeof Input> | null>(null)

watch(open, async (isOpen) => {
  if (!isOpen) return
  folder.value = props.initialFolder ?? ROOT_FOLDER_VALUE
  name.value = ''
  await nextTick()
  ;(nameInputRef.value?.$el as HTMLInputElement | undefined)?.focus()
})

function onSubmit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('create', { name: trimmed, folder: folder.value })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model="open"
    title="New folder"
  >
    <form
      class="grid gap-4"
      @submit.prevent="onSubmit"
    >
      <NoteFolderSelect
        id="new-folder-parent"
        v-model="folder"
        label="Root folder"
        root-label="Root"
        :folders="folders"
        :disabled="isBusy"
      />
      <div class="grid gap-2">
        <Label for="new-folder-name">Folder name</Label>
        <Input
          id="new-folder-name"
          ref="nameInputRef"
          v-model="name"
          type="text"
          placeholder="folder or parent/child"
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
          :disabled="isBusy || !name.trim()"
        >
          Create
        </Button>
      </div>
    </form>
  </Dialog>
</template>
