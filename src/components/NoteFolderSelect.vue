<script setup lang="ts">
import { computed } from 'vue'
import Label from '@/components/ui/Label.vue'
import { ROOT_FOLDER_LABEL, ROOT_FOLDER_VALUE } from '@/lib/noteFolders'

const folder = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    id: string
    folders: string[]
    label?: string
    rootLabel?: string
    disabled?: boolean
  }>(),
  { label: 'Folder', rootLabel: ROOT_FOLDER_LABEL },
)

const folderOptions = computed(() => [
  { value: ROOT_FOLDER_VALUE, label: props.rootLabel },
  ...props.folders.map((path) => ({ value: path, label: path })),
])
</script>

<template>
  <div class="grid gap-2">
    <Label :for="id">{{ label }}</Label>
    <select
      :id="id"
      v-model="folder"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :disabled="disabled"
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
</template>
