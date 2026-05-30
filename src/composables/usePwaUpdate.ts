import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_CHECK_MS = 60 * 60 * 1000

let updateToastId: string | number | undefined

export function usePwaUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      registration?.update()
      if (registration) {
        setInterval(() => registration.update(), UPDATE_CHECK_MS)
      }
    },
  })

  watch(needRefresh, (needs) => {
    if (!needs || updateToastId != null) return

    updateToastId = toast('Update available', {
      description: 'A new version of Nomagi is ready.',
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: 'Reload',
        onClick: () => {
          void updateServiceWorker(true)
        },
      },
      onDismiss: () => {
        updateToastId = undefined
      },
    })
  })
}
