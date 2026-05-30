import { reportError } from '@/lib/errors'

/** Warn when origin storage usage exceeds this fraction of quota. */
const QUOTA_WARN_RATIO = 0.85

const PERSIST_TOAST_SESSION_KEY = 'nomagi-storage-persist-toast-shown'
const QUOTA_TOAST_SESSION_KEY = 'nomagi-storage-quota-toast-shown'

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') return true
  if (err instanceof Error && /quota/i.test(err.message)) return true
  return false
}

export function storageQuotaExceededMessage(): string {
  return 'Device storage is full. Sync to the remote if you can, or free space in browser settings, then try again.'
}

export function hasStoragePersistenceApi(): boolean {
  return typeof navigator !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!hasStoragePersistenceApi()) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch (err) {
    reportError('storage.persist', err)
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  if (!hasStoragePersistenceApi()) return false
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}

export async function getStorageQuotaWarning(): Promise<string | null> {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) return null
  try {
    const { usage = 0, quota } = await navigator.storage.estimate()
    if (!quota || quota === 0) return null
    if (usage / quota < QUOTA_WARN_RATIO) return null

    const usedMb = (usage / (1024 * 1024)).toFixed(0)
    const quotaMb = (quota / (1024 * 1024)).toFixed(0)
    const percent = Math.round((usage / quota) * 100)
    return `Local storage is ${usedMb} MB of ${quotaMb} MB (${percent}%). Sync notes or free device storage to avoid data loss.`
  } catch (err) {
    reportError('storage.estimate', err)
    return null
  }
}

export type StorageSetupResult = {
  persistGranted: boolean
  quotaWarning: string | null
}

export async function ensureBrowserStorage(): Promise<StorageSetupResult> {
  const persistGranted = await requestPersistentStorage()
  const quotaWarning = await getStorageQuotaWarning()
  return { persistGranted, quotaWarning }
}

export function shouldShowPersistDeniedToast(): boolean {
  try {
    if (sessionStorage.getItem(PERSIST_TOAST_SESSION_KEY)) return false
    sessionStorage.setItem(PERSIST_TOAST_SESSION_KEY, '1')
    return true
  } catch {
    return true
  }
}

export function shouldShowQuotaWarningToast(): boolean {
  try {
    if (sessionStorage.getItem(QUOTA_TOAST_SESSION_KEY)) return false
    sessionStorage.setItem(QUOTA_TOAST_SESSION_KEY, '1')
    return true
  } catch {
    return true
  }
}

export async function withStorageErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isQuotaExceededError(err)) throw new Error(storageQuotaExceededMessage())
    throw err
  }
}
