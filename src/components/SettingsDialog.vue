<script setup lang="ts">
import { reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
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
  clone: []
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

function persistSettings() {
  emit('save', currentSettings())
}

function saveSettings() {
  persistSettings()
  toast.success('Settings saved')
  open.value = false
}

function handleClone() {
  persistSettings()
  emit('clone')
}

function onSubmit() {
  if (props.isCloned) {
    saveSettings()
  } else {
    handleClone()
  }
}
</script>

<template>
  <Dialog
    v-model="open"
    title="Settings"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <p class="text-sm text-muted-foreground">
        No account needed — just settings for git access, stored client-only.
      </p>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <Label html-for="author-name">Commit Name</Label>
          <Input
            id="author-name"
            v-model="draft.authorName"
          />
        </div>
        <div class="space-y-2">
          <Label html-for="author-email">Commit E-Mail</Label>
          <Input
            id="author-email"
            v-model="draft.authorEmail"
            type="email"
          />
        </div>
      </div>
      <div class="space-y-2">
        <Label html-for="repo-url">Repository URL</Label>
        <Input
          id="repo-url"
          v-model="draft.repoUrl"
          placeholder="https://github.com/user/notes.git"
        />
        <p class="text-sm text-muted-foreground">
          Use a dedicated notes repo — commits are automatic and frequent.
        </p>
      </div>
      <div class="space-y-2">
        <Label html-for="token">Personal Access Token</Label>
        <Input
          id="token"
          v-model="draft.token"
          type="password"
          placeholder="ghp_..."
        />
        <p class="text-sm text-muted-foreground">
          When using GitHub: Use a fine-grained token with permission
          “Read & Write access to code”, limited to your notes repo.
          <a
            href="https://github.com/settings/personal-access-tokens"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-foreground"
          >Create one on GitHub</a>.
        </p>
      </div>
      <div class="space-y-2">
        <Label html-for="cors-proxy">Git CORS Proxy</Label>
        <Input
          id="cors-proxy"
          v-model="draft.corsProxy"
          placeholder="/git-cors"
        />
        <p class="text-sm text-muted-foreground">
          Git hosts don’t allow cross-origin API access from web apps, so a proxy is required.
          The proxy will see your data. Use this default one or
          <a
            href="https://github.com/isomorphic-git/cors-proxy"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-foreground"
          >host your own</a>
          with one command.
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p class="text-sm font-medium">
          Thats all, lets go!
        </p>
        <Button
          type="submit"
          :disabled="isBusy"
        >
          {{ isCloned ? 'Save' : 'Clone Repository' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
