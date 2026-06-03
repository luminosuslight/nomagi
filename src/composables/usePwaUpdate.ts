import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_CHECK_MS = 60 * 60 * 1000

/** If a deploy left a waiting worker, activate it on this navigation/reload only. */
function activateWaitingWorkerOnLoad() {
  if (!('serviceWorker' in navigator)) return

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  void navigator.serviceWorker.ready.then((registration) => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
  })
}

export function usePwaUpdate() {
  activateWaitingWorkerOnLoad()

  useRegisterSW({
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      registration?.update()
      if (registration) {
        setInterval(() => registration.update(), UPDATE_CHECK_MS)
      }
    },
  })
}
