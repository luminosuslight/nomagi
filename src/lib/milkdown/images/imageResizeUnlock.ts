/**
 * Crepe uses `maxHeight` both as the default image height and as the drag-resize limit.
 * While a resize handle is dragged, the limit is raised to the height at which the image
 * fills the editor width, so images can be enlarged; it is restored on release.
 */
export function attachImageResizeUnlock(
  root: HTMLElement,
  getConfig: () => { maxHeight?: number } | undefined,
): () => void {
  function onPointerDown(event: PointerEvent) {
    const handle = (event.target as Element | null)?.closest?.(
      '.milkdown-image-block .image-resize-handle',
    )
    if (!handle) return
    const host = handle.closest('.milkdown-image-block')
    const image = handle.parentElement?.querySelector('img')
    const config = getConfig()
    if (!host || !image?.naturalWidth || !config) return

    const defaultMaxHeight = config.maxHeight
    const fillWidthHeight =
      (host.getBoundingClientRect().width * image.naturalHeight) / image.naturalWidth
    config.maxHeight = Math.max(defaultMaxHeight ?? 0, fillWidthHeight)

    const restore = () => {
      config.maxHeight = defaultMaxHeight
      window.removeEventListener('pointerup', restore)
      window.removeEventListener('pointercancel', restore)
    }
    window.addEventListener('pointerup', restore)
    window.addEventListener('pointercancel', restore)
  }

  root.addEventListener('pointerdown', onPointerDown, true)
  return () => root.removeEventListener('pointerdown', onPointerDown, true)
}
