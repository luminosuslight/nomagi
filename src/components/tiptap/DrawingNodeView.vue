<script setup lang="ts">
import { inject } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import DrawingBlock from '@/components/drawing/DrawingBlock.vue'
import { editorOverlayRootKey } from '@/lib/editorOverlay'
import type { DrawingLine } from '@/lib/drawing/drawingTypes'

const props = defineProps(nodeViewProps)

const overlayRoot = inject(editorOverlayRootKey, null)

function setLines(nextLines: DrawingLine[]) {
  props.updateAttributes({ lines: nextLines })
}
</script>

<template>
  <NodeViewWrapper
    class="draw my-4"
    contenteditable="false"
  >
    <DrawingBlock
      :lines="(node.attrs.lines as DrawingLine[])"
      :editable="editor.isEditable"
      :overlay-root="overlayRoot"
      :on-update-lines="setLines"
    />
  </NodeViewWrapper>
</template>
