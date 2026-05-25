import type { InjectionKey, Ref } from 'vue'

export const tiptapEditorOverlayRootKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('tiptapEditorOverlayRoot')
