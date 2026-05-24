<script setup lang="ts">
import { reactive, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import type { GitSettings } from '@/composables/useGit'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  settings: GitSettings
  isCloned: boolean
  isBusy: boolean
}>()

const emit = defineEmits<{
  save: [settings: GitSettings]
  clone: [settings: GitSettings]
}>()

const draft = reactive({
  repoUrl: '',
  token: '',
  corsProxy: '',
  authorName: '',
  authorEmail: '',
})

watch(
  () => props.settings,
  (settings) => {
    draft.repoUrl = settings.repoUrl
    draft.token = settings.token
    draft.corsProxy = settings.corsProxy
    draft.authorName = settings.author.name
    draft.authorEmail = settings.author.email
  },
  { immediate: true, deep: true },
)

function currentSettings(): GitSettings {
  return {
    repoUrl: draft.repoUrl,
    token: draft.token,
    corsProxy: draft.corsProxy,
    author: { name: draft.authorName, email: draft.authorEmail },
  }
}

function saveSettings() {
  emit('save', currentSettings())
}

function handleClone() {
  const next = currentSettings()
  emit('save', next)
  emit('clone', next)
}
</script>

<template>
  <Dialog
    v-model="open"
    title="Settings"
    description="Configure your git repository."
  >
    <form
      class="space-y-4"
      @submit.prevent="saveSettings"
    >
      <div class="space-y-2">
        <Label html-for="repo-url">Repository URL</Label>
        <Input
          id="repo-url"
          v-model="draft.repoUrl"
          placeholder="https://github.com/user/notes.git"
        />
      </div>
      <div class="space-y-2">
        <Label html-for="token">Personal Access Token</Label>
        <Input
          id="token"
          v-model="draft.token"
          type="password"
          placeholder="ghp_..."
        />
      </div>
      <div class="space-y-2">
        <Label html-for="cors-proxy">CORS Proxy (optional)</Label>
        <Input
          id="cors-proxy"
          v-model="draft.corsProxy"
          placeholder="/git-cors"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <Label html-for="author-name">Author Name</Label>
          <Input
            id="author-name"
            v-model="draft.authorName"
          />
        </div>
        <div class="space-y-2">
          <Label html-for="author-email">Author Email</Label>
          <Input
            id="author-email"
            v-model="draft.authorEmail"
          />
        </div>
      </div>
      <div class="flex flex-wrap gap-2 pt-2">
        <Button
          type="submit"
          variant="secondary"
        >
          Save
        </Button>
        <Button
          v-if="!isCloned"
          type="button"
          :disabled="isBusy"
          @click="handleClone"
        >
          Clone Repository
        </Button>
      </div>
    </form>
  </Dialog>
</template>
