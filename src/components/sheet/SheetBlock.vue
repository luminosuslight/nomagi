<script setup lang="ts">
/* Parent passes a Ref via drawingEditing; updating .value is intentional. */
/* eslint-disable vue/no-mutating-props */
import { computed, isRef, onUnmounted, ref, watch, type Ref } from 'vue'
import { Table } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import SheetEditor from '@/components/sheet/SheetEditor.vue'
import { cloneSheet, type SheetCell } from '@/lib/sheet/sheetTypes'

const props = defineProps<{
  cells: SheetCell[][] | Ref<SheetCell[][]>
  editable: boolean | Ref<boolean>
  overlayRoot?: HTMLElement | null | Ref<HTMLElement | null | null>
  drawingEditing?: Ref<boolean> | null
  onUpdateCells: (cells: SheetCell[][]) => void
}>()

const editing = ref(false)

const cellsValue = computed(() => (isRef(props.cells) ? props.cells.value : props.cells))

const editableValue = computed(() =>
  isRef(props.editable) ? props.editable.value : props.editable,
)

const overlayTarget = computed(() => {
  const value = props.overlayRoot
  if (value == null) return undefined
  return isRef(value) ? (value.value ?? undefined) : value
})

const header = computed(() => cellsValue.value[0] ?? [])
const body = computed(() => cellsValue.value.slice(1))

function displayCell(cell: SheetCell | undefined): string {
  return cell?.value ?? ''
}

function startEditing(event: Event) {
  if (!editableValue.value) return
  event.preventDefault()
  event.stopPropagation()
  editing.value = true
}

function save(next: SheetCell[][]) {
  props.onUpdateCells(cloneSheet(next))
  editing.value = false
}

function cancel() {
  editing.value = false
}

watch(editing, (isEditing) => {
  if (props.drawingEditing) props.drawingEditing.value = isEditing
})

onUnmounted(() => {
  if (props.drawingEditing) props.drawingEditing.value = false
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-md border border-border/60 bg-background"
    contenteditable="false"
  >
    <Button
      v-if="editableValue"
      type="button"
      variant="outline"
      size="sm"
      class="absolute left-2 top-2 z-10 gap-1.5 bg-background/90 text-base shadow-sm backdrop-blur-sm"
      data-drawing-edit
      contenteditable="false"
      @click.stop="startEditing"
    >
      <Table class="size-4" />
      Edit
    </Button>
    <div
      class="sheet-preview"
      @click="startEditing"
    >
      <table>
        <thead>
          <tr>
            <th
              v-for="(cell, col) in header"
              :key="col"
            >
              {{ displayCell(cell) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in body"
            :key="rowIndex"
          >
            <td
              v-for="(cell, col) in row"
              :key="col"
            >
              {{ displayCell(cell) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Teleport
    v-if="editing && overlayTarget"
    :to="overlayTarget"
  >
    <SheetEditor
      :cells="cellsValue"
      @save="save"
      @cancel="cancel"
    />
  </Teleport>
</template>

<style>
/* Crepe reset.css zeros padding and button styles on everything inside .milkdown. */
.milkdown .milkdown-sheet-block .sheet-preview {
  padding: 2.75rem 0.75rem 0.75rem;
  overflow-x: auto;
}

.milkdown .milkdown-sheet-block table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.milkdown .milkdown-sheet-block th,
.milkdown .milkdown-sheet-block td {
  height: 2.25rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
  font-weight: 400;
}

.milkdown .milkdown-sheet-block thead th {
  font-weight: 600;
}

.milkdown .milkdown-sheet-block button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--input);
  background-color: color-mix(in oklch, var(--background) 90%, transparent);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  backdrop-filter: blur(4px);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  color: var(--foreground);
  cursor: pointer;
  transition:
    color 150ms,
    background-color 150ms;
}

.milkdown .milkdown-sheet-block button:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
</style>
