<script setup lang="ts">
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariants } from './button'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'default',
    size: 'default',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="cn(buttonVariants({ variant, size }), $attrs.class as string)"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
