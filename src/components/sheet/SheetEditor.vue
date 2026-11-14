<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import jspreadsheet from 'jspreadsheet-ce'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'
import Button from '@/components/ui/Button.vue'
import { bakeSheetResults } from '@/lib/sheet/evaluateSheet'
import {
  applyFormulaReference,
  formulaReferenceRanges,
  rangeReference,
  sheetCellsFromEditorValues,
  sheetCellsToEditorValues,
  type GridCoord,
} from '@/lib/sheet/sheetGrid'
import { trimSheet } from '@/lib/sheet/sheetMarkdown'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

const MIN_ROWS = 12
const MIN_COLS = 8

const props = defineProps<{
  cells: SheetCell[][]
}>()

const emit = defineEmits<{
  save: [cells: SheetCell[][]]
  cancel: []
}>()

const overlay = ref<HTMLElement | null>(null)
const gridHost = ref<HTMLDivElement | null>(null)

type Worksheet = ReturnType<typeof jspreadsheet>[number]
type FormulaInput = HTMLInputElement | HTMLTextAreaElement
let worksheet: Worksheet | null = null
let pickAnchor: GridCoord | null = null
let pickSpan: { from: number; to: number } | null = null
let swallowClick = false

function formulaInput(): FormulaInput | null {
  const cell = worksheet?.edition?.[0]
  if (!cell) return null
  const input = cell.querySelector('input, textarea')
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return null
  if (!input.value.trimStart().startsWith('=')) return null
  return input
}

function cellFromTarget(target: EventTarget | null): GridCoord | null {
  if (!(target instanceof Element)) return null
  const cell = target.closest('tbody td[data-x][data-y]')
  if (!(cell instanceof HTMLTableCellElement)) return null
  const x = Number(cell.getAttribute('data-x'))
  const y = Number(cell.getAttribute('data-y'))
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null
  return { x, y }
}

function holdFormulaEditor(input: FormulaInput) {
  if (input.dataset.formulaPick === '1') return
  const previous = input.onblur
  input.dataset.formulaPick = '1'
  input.onblur = () => {
    if (pickAnchor) {
      input.focus({ preventScroll: true })
      return
    }
    if (typeof previous === 'function') previous.call(input, new FocusEvent('blur'))
  }
}

function writeReference(input: FormulaInput, reference: string, fresh: boolean) {
  if (fresh || !pickSpan) {
    const applied = applyFormulaReference(
      input.value,
      input.selectionStart ?? input.value.length,
      input.selectionEnd ?? input.value.length,
      reference,
    )
    if (!applied) return false
    input.value = applied.value
    input.setSelectionRange(applied.cursor, applied.cursor)
    pickSpan = { from: applied.cursor - reference.length, to: applied.cursor }
    refreshFormulaHighlights()
    return true
  }
  input.value = input.value.slice(0, pickSpan.from) + reference + input.value.slice(pickSpan.to)
  pickSpan.to = pickSpan.from + reference.length
  input.setSelectionRange(pickSpan.to, pickSpan.to)
  refreshFormulaHighlights()
  return true
}

function clearFormulaRefs() {
  gridHost.value?.querySelectorAll('td.formula-ref').forEach((cell) => {
    cell.classList.remove('formula-ref')
  })
}

function refreshFormulaHighlights() {
  clearFormulaRefs()
  const input = formulaInput()
  const sheet = worksheet
  if (!input || !sheet) return
  const maxX = sheet.headers.length - 1
  const maxY = sheet.rows.length - 1
  for (const range of formulaReferenceRanges(input.value)) {
    const x1 = Math.max(0, range.x1)
    const y1 = Math.max(0, range.y1)
    const x2 = Math.min(maxX, range.x2)
    const y2 = Math.min(maxY, range.y2)
    if (x1 > x2 || y1 > y2) continue
    if ((x2 - x1 + 1) * (y2 - y1 + 1) > 400) continue
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        sheet.records[y]?.[x]?.element.classList.add('formula-ref')
      }
    }
  }
}

function onFormulaFocus(event: FocusEvent) {
  const input = event.target
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return
  if (input.dataset.formulaHighlight !== '1') {
    input.dataset.formulaHighlight = '1'
    input.addEventListener('input', refreshFormulaHighlights)
  }
  // Jspreadsheet focuses the editor before assigning its value, so the formula
  // is not readable until this call stack finishes.
  refreshFormulaHighlights()
  queueMicrotask(refreshFormulaHighlights)
}

function detachPickListeners() {
  window.removeEventListener('pointermove', onPickMove, true)
  window.removeEventListener('mousemove', onPickMove, true)
  window.removeEventListener('pointerup', onPickUp, true)
  window.removeEventListener('mouseup', onPickUp, true)
  window.removeEventListener('pointercancel', onPickUp, true)
}

function onPickMove(event: Event) {
  if (!pickAnchor) return
  const input = formulaInput()
  const cell = cellFromTarget(event.target)
  if (!input || !cell) return
  event.preventDefault()
  event.stopPropagation()
  writeReference(input, rangeReference(pickAnchor, cell), false)
  input.focus({ preventScroll: true })
}

function onPickUp(event: Event) {
  if (pickAnchor) {
    event.preventDefault()
    event.stopPropagation()
  }
  pickAnchor = null
  detachPickListeners()
}

function onFormulaMouseDown(event: MouseEvent) {
  if (!pickAnchor) return
  event.preventDefault()
  event.stopPropagation()
}

function onPickDown(event: PointerEvent | MouseEvent) {
  if ('pointerType' in event && event.pointerType === 'mouse' && pickAnchor) return
  if (event.button !== 0) return
  const input = formulaInput()
  if (!input) return
  const editorCell = worksheet?.edition?.[0]
  if (editorCell && event.target instanceof Node && editorCell.contains(event.target)) return
  const cell = cellFromTarget(event.target)
  if (!cell) return
  const reference = rangeReference(cell, cell)
  const applied = applyFormulaReference(
    input.value,
    input.selectionStart ?? input.value.length,
    input.selectionEnd ?? input.value.length,
    reference,
  )
  if (!applied) return
  event.preventDefault()
  event.stopPropagation()
  input.value = applied.value
  input.setSelectionRange(applied.cursor, applied.cursor)
  pickSpan = { from: applied.cursor - reference.length, to: applied.cursor }
  pickAnchor = cell
  swallowClick = true
  holdFormulaEditor(input)
  refreshFormulaHighlights()
  input.focus({ preventScroll: true })
  detachPickListeners()
  window.addEventListener('pointermove', onPickMove, true)
  window.addEventListener('mousemove', onPickMove, true)
  window.addEventListener('pointerup', onPickUp, true)
  window.addEventListener('mouseup', onPickUp, true)
  window.addEventListener('pointercancel', onPickUp, true)
}

function onPickClick(event: MouseEvent) {
  if (!swallowClick) return
  swallowClick = false
  event.preventDefault()
  event.stopPropagation()
}

function syncHeaderPlaceholder() {
  const cell = worksheet?.records[0]?.[0]?.element
  if (!cell) return
  const value = worksheet?.getValueFromCoords(0, 0, false)
  const empty = value == null || String(value).trim() === ''
  cell.classList.toggle('header-placeholder', empty)
}

function commitOpenEditor() {
  const edition = worksheet?.edition
  if (edition) worksheet?.closeEditor(edition[0], true)
}

function readCells(): SheetCell[][] {
  commitOpenEditor()
  const data = worksheet?.getData(false, false) ?? []
  return bakeSheetResults(trimSheet(sheetCellsFromEditorValues(data)))
}

function save() {
  emit('save', readCells())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (worksheet?.edition) return
  event.preventDefault()
  emit('cancel')
}

onMounted(() => {
  overlay.value?.focus()
  void nextTick(() => {
    const host = gridHost.value
    if (!host) return
    const height = Math.max(host.clientHeight, 320)
    const instances = jspreadsheet(host, {
      parseFormulas: true,
      autoIncrement: true,
      oneditionend: (_instance, _cell, x, y) => {
        clearFormulaRefs()
        syncHeaderPlaceholder()
        // Enter moves down from the current selection. Point it back at the
        // formula cell so it does not follow the last reference that was clicked.
        worksheet?.updateSelectionFromCoords(x, y, x, y)
      },
      onchange: () => {
        syncHeaderPlaceholder()
      },
      worksheets: [
        {
          data: sheetCellsToEditorValues(props.cells),
          minDimensions: [MIN_COLS, MIN_ROWS],
          minSpareRows: 1,
          minSpareCols: 1,
          columnResize: true,
          rowResize: true,
          selectionCopy: true,
          columnSorting: false,
          allowRenameColumn: false,
          defaultColWidth: 128,
          defaultRowHeight: 36,
          defaultColAlign: 'left',
          tableOverflow: true,
          tableWidth: host.clientWidth || '100%',
          tableHeight: height,
        },
      ],
    })
    worksheet = instances[0] ?? null
    syncHeaderPlaceholder()
    const lastRow = Math.max(0, (worksheet?.rows.length ?? 1) - 1)
    worksheet?.updateSelectionFromCoords(0, Math.min(1, lastRow), 0, Math.min(1, lastRow))
  })
})

onUnmounted(() => {
  detachPickListeners()
  const host = gridHost.value
  if (!host) return
  jspreadsheet.destroy(host as Parameters<typeof jspreadsheet.destroy>[0], true)
  worksheet = null
})
</script>

<template>
  <div
    ref="overlay"
    tabindex="-1"
    class="sheet-editor absolute inset-0 z-50 flex min-h-0 flex-col overscroll-contain bg-background outline-none"
    data-drawing-editor
    contenteditable="false"
    @keydown.capture="onKeydown"
  >
    <div
      class="flex shrink-0 items-center justify-end gap-2 border-b px-4 py-3"
      data-drawing-controls
    >
      <Button
        type="button"
        variant="outline"
        class="text-base"
        @click="emit('cancel')"
      >
        Cancel
      </Button>
      <Button
        type="button"
        class="text-base"
        @click="save"
      >
        Save
      </Button>
    </div>
    <div
      ref="gridHost"
      class="sheet-grid min-h-0 flex-1"
      @pointerdown.capture="onPickDown"
      @mousedown.capture="onFormulaMouseDown"
      @click.capture="onPickClick"
      @focusin="onFormulaFocus"
    />
  </div>
</template>

<style>
.sheet-editor .jss_worksheet,
.sheet-editor .jss_worksheet td,
.sheet-editor .jss_worksheet input,
.sheet-editor .jss_worksheet textarea,
.sheet-editor .jss_worksheet [contenteditable='true'] {
  font-size: 16px;
}

.sheet-editor .jss_spreadsheet,
.sheet-editor .jss_container,
.sheet-editor .jss_content {
  width: 100%;
  max-width: 100%;
}

.sheet-editor .jss_worksheet td.formula-ref {
  background-color: rgb(255 236 153 / 0.7);
  box-shadow: inset 0 0 0 2px #e0a800;
}

.sheet-editor .jss_worksheet td.header-placeholder:not(.editor)::before {
  content: 'Header';
  color: #a3a3a3;
  font-style: italic;
  pointer-events: none;
}
</style>
