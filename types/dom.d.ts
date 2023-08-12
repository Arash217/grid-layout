import { DroppableEvent } from '../src/helpers/utils'

interface CustomEventMap {
  'droppable-dragover': DroppableEvent
  'droppable-drop': DroppableEvent
}

declare global {
  interface Document {
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void
  }
}

export {}
