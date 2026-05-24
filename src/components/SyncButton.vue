<script setup lang="ts">
import { RefreshCw, Wifi, WifiOff } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import type { SyncStatus } from '@/composables/useGit'

defineProps<{
  syncStatus: SyncStatus
  isBusy: boolean
  isOnline: boolean
}>()

const emit = defineEmits<{
  sync: []
}>()
</script>

<template>
  <Button
    type="button"
    variant="outline"
    class="w-full"
    :disabled="isBusy || !isOnline"
    @click="emit('sync')"
  >
    <RefreshCw :class="['size-4', syncStatus === 'syncing' && 'animate-spin']" />
    Sync
    <Wifi
      v-if="isOnline"
      class="size-3.5 ml-auto text-muted-foreground"
    />
    <WifiOff
      v-else
      class="size-3.5 ml-auto text-muted-foreground"
    />
  </Button>
</template>
