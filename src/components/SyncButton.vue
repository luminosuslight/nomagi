<script setup lang="ts">
import { RefreshCw, Wifi, WifiOff } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import type { SyncStatus } from '@/composables/useGit'

withDefaults(
  defineProps<{
    syncStatus: SyncStatus
    isBusy: boolean
    isOnline: boolean
    hasUnsyncedChanges?: boolean
    compact?: boolean
  }>(),
  { compact: false },
)

const emit = defineEmits<{
  sync: []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="hasUnsyncedChanges"
      class="size-2 shrink-0 rounded-full bg-amber-500"
      title="Unpushed commits"
      aria-label="Unpushed commits"
    />
    <Button
      v-if="compact"
      type="button"
      variant="ghost"
      size="icon"
      :disabled="isBusy || !isOnline"
      :title="isOnline ? 'Sync' : 'Offline'"
      aria-label="Sync"
      @click="emit('sync')"
    >
      <RefreshCw :class="['size-4', syncStatus === 'syncing' && 'animate-spin']" />
    </Button>
    <Button
      v-else
      type="button"
      variant="outline"
      class="min-w-0 flex-1"
      :disabled="isBusy || !isOnline"
      @click="emit('sync')"
    >
      <RefreshCw :class="['size-4', syncStatus === 'syncing' && 'animate-spin']" />
      Sync
      <Wifi
        v-if="isOnline"
        class="ml-auto size-3.5 text-muted-foreground"
      />
      <WifiOff
        v-else
        class="ml-auto size-3.5 text-muted-foreground"
      />
    </Button>
  </div>
</template>
