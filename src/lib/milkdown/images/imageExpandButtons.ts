const BUTTON_CLASS = 'image-expand-button'
const IMAGE_HOSTS = '.milkdown-image-block, .milkdown-image-inline'
const IMAGES = '.milkdown-image-block .image-wrapper img, .milkdown-image-inline img.image-inline'

/** Lucide `maximize-2`. */
const EXPAND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>'

function stop(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

function createButton(
  extraClass: string,
  onOpen: (image: HTMLImageElement) => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${BUTTON_CLASS} ${extraClass}`
  button.title = 'View image'
  button.setAttribute('aria-label', 'View image')
  button.innerHTML = EXPAND_ICON
  // Keep ProseMirror from treating the press as a node selection or drag start.
  button.addEventListener('pointerdown', stop)
  button.addEventListener('mousedown', stop)
  button.addEventListener('click', (event) => {
    stop(event)
    const image = button.closest(IMAGE_HOSTS)?.querySelector<HTMLImageElement>(IMAGES)
    if (image) onOpen(image)
  })
  return button
}

function addMissingButtons(root: HTMLElement, onOpen: (image: HTMLImageElement) => void) {
  for (const operation of root.querySelectorAll<HTMLElement>(
    '.milkdown-image-block .image-wrapper > .operation',
  )) {
    if (!operation.querySelector(`.${BUTTON_CLASS}`)) {
      operation.append(createButton('operation-item', onOpen))
    }
  }
  for (const host of root.querySelectorAll<HTMLElement>('.milkdown-image-inline')) {
    const hasImage = host.querySelector('img.image-inline') !== null
    const button = host.querySelector(`:scope > .${BUTTON_CLASS}`)
    if (hasImage && !button) host.append(createButton('image-inline-expand-button', onOpen))
    else if (!hasImage && button) button.remove()
  }
}

/**
 * Crepe renders images in their own Vue apps, so the expand button is injected into the
 * block image toolbar (or over inline images) and re-added whenever those re-render.
 */
export function attachImageExpandButtons(
  root: HTMLElement,
  onOpen: (image: HTMLImageElement) => void,
): () => void {
  addMissingButtons(root, onOpen)
  const observer = new MutationObserver(() => addMissingButtons(root, onOpen))
  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}

/** Block and inline images currently rendered in `root`, in document order. */
export function collectImages(root: HTMLElement): HTMLImageElement[] {
  return [...root.querySelectorAll<HTMLImageElement>(IMAGES)]
}
