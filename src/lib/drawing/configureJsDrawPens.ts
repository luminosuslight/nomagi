import {
  Color4,
  makeFreehandLineBuilder,
  makePolylineBuilder,
  makePressureSensitiveFreehandLineBuilder,
  PenTool,
  type Editor,
  type PenStyle,
} from 'js-draw'

const SKETCH_LINE_PEN_TYPE_IDS = new Set(['polyline-pen', 'freehand-pen', 'pressure-sensitive-pen'])

/** Limits pen-type dropdowns to line pens (no shapes). */
export function sketchLinePenTypeFilter(penType: { id: string; isShapeBuilder?: boolean }) {
  return !penType.isShapeBuilder && SKETCH_LINE_PEN_TYPE_IDS.has(penType.id)
}

function configurePen(
  pen: PenTool,
  style: Pick<PenStyle, 'color' | 'thickness' | 'factory'>,
  options: {
    stabilization?: boolean
    autocorrect?: boolean
    pressureSensitivity?: boolean
  } = {},
) {
  pen.setStrokeFactory(style.factory)
  pen.setColor(style.color)
  pen.setThickness(style.thickness)
  pen.setHasStabilization(options.stabilization ?? false)
  pen.setStrokeAutocorrectEnabled(options.autocorrect ?? false)
  if (options.pressureSensitivity !== undefined) {
    pen.setPressureSensitivityEnabled(options.pressureSensitivity)
  }
}

/** Default pen, marker, and highlighter for note sketches. */
export function configureJsDrawPens(editor: Editor) {
  const pens = editor.toolController.getMatchingTools(PenTool)
  if (pens.length < 3) return

  const [linePen, markerPen, highlighterPen] = pens

  configurePen(
    linePen,
    {
      factory: makePolylineBuilder,
      color: Color4.fromString('#00008b'),
      thickness: 3,
    },
    { pressureSensitivity: false },
  )

  configurePen(
    markerPen,
    {
      factory: makeFreehandLineBuilder,
      color: Color4.black,
      thickness: 4,
    },
    { pressureSensitivity: false },
  )

  configurePen(
    highlighterPen,
    {
      factory: makePressureSensitiveFreehandLineBuilder,
      color: Color4.ofRGBA(1, 1, 0, 0.5),
      thickness: 40,
    },
    { pressureSensitivity: true },
  )
}

export const jsDrawPenSettings = {
  filterPenTypes: sketchLinePenTypeFilter,
} as const
