<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Upload } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'

const open = defineModel<boolean>({ default: false })

defineProps<{
  canUpload: boolean
}>()

const emit = defineEmits<{
  add: [source: { src: string } | { file: File }]
}>()

const src = ref('')
const srcInputRef = ref<InstanceType<typeof Input> | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(open, async (isOpen) => {
  if (!isOpen) return
  src.value = ''
  await nextTick()
  ;(srcInputRef.value?.$el as HTMLInputElement | undefined)?.focus()
})

function onSubmit() {
  const value = src.value.trim()
  if (!value) return
  emit('add', { src: value })
  open.value = false
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  emit('add', { file })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model="open"
    title="Add image"
    description="Paste an image URL or a path in this repository (e.g. pasted_images/photo.webp), or upload a new image."
  >
    <form
      class="grid gap-4"
      @submit.prevent="onSubmit"
    >
      <div class="grid gap-2">
        <Label for="canvas-image-src">URL or repository path</Label>
        <Input
          id="canvas-image-src"
          ref="srcInputRef"
          v-model="src"
          type="text"
          placeholder="https://… or folder/image.png"
          class="text-base"
        />
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          v-if="canUpload"
          type="button"
          variant="outline"
          class="mr-auto"
          @click="fileInputRef?.click()"
        >
          <Upload class="size-4" />
          Upload…
        </Button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileChange"
        >
        <Button
          type="button"
          variant="outline"
          @click="open = false"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          :disabled="!src.trim()"
        >
          Add
        </Button>
      </div>
    </form>
  </Dialog>
</template>
