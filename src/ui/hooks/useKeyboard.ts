import { useEffect, useRef } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

type Options = {
  enabled?: boolean
  target?: Document | HTMLElement | null
  allowInInput?: boolean
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  escape: 'escape',
  enter: 'enter',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  arrowup: 'arrowup',
  arrowdown: 'arrowdown',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
}

function normalizedKey(key: string): string {
  const lower = key.toLowerCase()
  return KEY_ALIASES[lower] ?? lower
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false
  const tag = target.tagName
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type?.toLowerCase()
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'color', 'range'].includes(type)
  }
  return tag === 'TEXTAREA' || tag === 'SELECT' || (target instanceof HTMLElement && target.isContentEditable)
}

/**
 * Small local shortcut hook, following ReactKit's useKeyboard shape for the
 * screen-level cases Periscope needs: normalized key names, live handlers, and
 * editable-target protection. Spatial grid navigation stays local to Grid.
 */
export function useKeyboard(bindings: Record<string, KeyHandler>, options: Options = {}) {
  const { enabled = true, target, allowInInput = false } = options
  const latest = useRef({ bindings, allowInInput })

  useEffect(() => {
    latest.current = { bindings, allowInInput }
  })

  useEffect(() => {
    if (!enabled) return
    const targetEl: EventTarget | null = target ?? (typeof document !== 'undefined' ? document : null)
    if (!targetEl) return

    const onKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.repeat) return
      const { bindings, allowInInput } = latest.current
      if (!allowInInput && isEditableTarget(keyboardEvent.target)) return
      const handler = bindings[normalizedKey(keyboardEvent.key)]
      if (!handler) return
      keyboardEvent.preventDefault()
      handler(keyboardEvent)
    }

    targetEl.addEventListener('keydown', onKeyDown)
    return () => targetEl.removeEventListener('keydown', onKeyDown)
  }, [enabled, target])
}
