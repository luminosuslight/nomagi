<script setup lang="ts">
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerRoot,
} from 'reka-ui'
import { Check } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const model = defineModel<string>({ default: '#000000' })

withDefaults(
  defineProps<{
    colors?: string[]
    disabled?: boolean
    class?: string
  }>(),
  {
    colors: () => [
      '#000000',
      '#A975FF',
      '#FB5151',
      '#FD9170',
      '#FFCB6B',
      '#68CEF8',
      '#80CBC4',
      '#9DEF8F',
    ],
    disabled: false,
  },
)
</script>

<template>
  <Popover :modal="true">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="icon"
        :disabled="disabled"
        :class="cn('size-9 shrink-0 rounded-full p-0', $props.class)"
        aria-label="Choose stroke color"
      >
        <span
          class="size-7 rounded-full border border-border/60"
          :style="{ backgroundColor: model }"
        />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-3">
      <ColorSwatchPickerRoot v-model="model">
        <div class="flex flex-wrap gap-2">
          <ColorSwatchPickerItem
            v-for="swatch in colors"
            :key="swatch"
            :value="swatch"
            class="relative size-8 rounded-md border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-foreground"
          >
            <div
              class="size-full rounded-md ring-1 ring-inset ring-black/15"
              :style="{ backgroundColor: swatch }"
            />
            <ColorSwatchPickerItemIndicator class="absolute inset-0 flex items-center justify-center">
              <Check class="size-4 text-white drop-shadow-sm" />
            </ColorSwatchPickerItemIndicator>
          </ColorSwatchPickerItem>
        </div>
      </ColorSwatchPickerRoot>
    </PopoverContent>
  </Popover>
</template>
