<script setup lang="ts">
import { ref } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'

const initial = [
  'Type / and choose Spreadsheet.',
  '',
  '<!-- sheet -->',
  '| Item | Amount | Cost per Item | Total |',
  '| --- | --- | --- | --- |',
  '| Foo | 2 | 10 | [20](<#B2*C2>) |',
  '| Bar | 3 | 10 | [30](<#B3*C3>) |',
  '|  |  |  | [50](<#SUM(D2:D3)>) |',
  '',
  '<!-- sheet -->',
  '|  |  |  |',
  '| --- | --- | --- |',
  '|  |  |  |',
  '|  |  |  |',
  '|  |  |  |',
].join('\n')

const markdown = ref(initial)
</script>

<template>
  <div class="flex h-dvh">
    <div class="relative min-h-0 min-w-0 flex-1">
      <MilkdownProvider>
        <MilkdownEditor v-model="markdown" />
      </MilkdownProvider>
    </div>
    <textarea
      :value="markdown"
      readonly
      class="w-[28rem] shrink-0 resize-none border-l bg-neutral-50 p-4 font-mono text-base"
      aria-label="Markdown source"
    />
  </div>
</template>
