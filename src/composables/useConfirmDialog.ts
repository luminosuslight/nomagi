import { ref, shallowRef } from 'vue'

export type ConfirmDialogOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
}

const open = ref(false)
const options = shallowRef<ConfirmDialogOptions | null>(null)

let settle: ((confirmed: boolean) => void) | null = null

export function confirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (settle) settle(false)
    settle = resolve
    options.value = opts
    open.value = true
  })
}

/** Mount once in App.vue — binds ConfirmAlertDialog to {@link confirmDialog}. */
export function useConfirmDialogHost() {
  function finish(confirmed: boolean) {
    open.value = false
    options.value = null
    const resolve = settle
    settle = null
    resolve?.(confirmed)
  }

  return {
    open,
    options,
    onConfirm: () => finish(true),
    onCancel: () => finish(false),
  }
}
