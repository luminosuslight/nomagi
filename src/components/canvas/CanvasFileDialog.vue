<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import { listDisplayName } from '@/lib/noteDisplay'

const MAX_RESULTS = 50

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  files: string[]
}>()

const emit = defineEmits<{
  add: [filepath: string]
}>()

const query = ref('')
const queryInputRef = ref<InstanceType<typeof Input> | null>(null)

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const found = needle
    ? props.files.filter((path) => path.toLowerCase().includes(needle))
    : props.files
  return found.slice(0, MAX_RESULTS)
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  query.value = ''
  await nextTick()
  ;(queryInputRef.value?.$el as HTMLInputElement | undefined)?.focus()
})

function choose(filepath: string) {
  emit('add', filepath)
  open.value = false
}

function onSubmit() {
  const [first] = matches.value
  if (first) choose(first)
}
</script>

<template>
  <Dialog
    v-model="open"
    title="Add note"
    description="Embed an existing note. Markdown notes can be edited right on the whiteboard."
  >
    <form
      class="grid gap-3"
      @submit.prevent="onSubmit"
    >
      <Input
        ref="queryInputRef"
        v-model="query"
        type="search"
        placeholder="Search notes"
        aria-label="Search notes"
        class="text-base"
      />
      <ul class="grid max-h-80 gap-0.5 overflow-y-auto">
        <li
          v-for="filepath in matches"
          :key="filepath"
        >
          <button
            type="button"
            class="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-accent"
            @click="choose(filepath)"
          >
            <span class="w-full truncate text-sm font-medium">{{ listDisplayName(filepath) }}</span>
            <span class="w-full truncate text-xs text-muted-foreground">{{ filepath }}</span>
          </button>
        </li>
        <li
          v-if="matches.length === 0"
          class="px-2 py-1.5 text-sm text-muted-foreground"
        >
          No matching notes.
        </li>
      </ul>
    </form>
  </Dialog>
</template>
