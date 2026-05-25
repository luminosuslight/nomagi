import type { InjectionKey, Ref } from 'vue'

export const editorOverlayRootKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('editorOverlayRoot')
