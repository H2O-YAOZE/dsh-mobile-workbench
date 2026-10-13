import { useSyncExternalStore } from 'react'

const KEY = 'dsh.session.pins.v1'
const CHANGED = 'dsh-session-pins-changed'
let rawCache: string | null | undefined
let cache: readonly string[] = []

/** Preserve the existing on-device pin format, including its ordering. */
export function readSessionPins(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw === rawCache) return cache
    rawCache = raw
    const value: unknown = raw === null ? [] : JSON.parse(raw)
    cache = Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))].slice(0,500) : []
  } catch { cache = []; rawCache = undefined }
  return cache
}

export function toggleSessionPin(id: string): void {
  const pins = readSessionPins()
  const next = pins.includes(id) ? pins.filter(v => v !== id) : [id,...pins].slice(0,500)
  try { window.localStorage.setItem(KEY,JSON.stringify(next)) }
  catch { return }
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(listener: () => void): () => void {
  const storage = (e: StorageEvent): void => { if(e.key === KEY || e.key === null) listener() }
  window.addEventListener('storage',storage)
  window.addEventListener(CHANGED,listener)
  return () => { window.removeEventListener('storage',storage);window.removeEventListener(CHANGED,listener) }
}

export function useSessionPins(): readonly string[] {
  return useSyncExternalStore(subscribe,readSessionPins,readSessionPins)
}
