import { type NewsItem } from "@/lib/news-sources"

type FavoritesSnapshot = {
  version: 1
  items: NewsItem[]
}

const STORAGE_KEY = "newsflow_favorites_v1"
const EVENT_NAME = "newsflow_favorites_changed"

let cachedItems: NewsItem[] = []
let initialized = false

function safeParse(json: string | null): FavoritesSnapshot | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as FavoritesSnapshot
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function readFromStorage(): NewsItem[] {
  if (typeof window === "undefined") return []
  const snap = safeParse(window.localStorage.getItem(STORAGE_KEY))
  return snap?.items || []
}

function writeToStorage(items: NewsItem[]) {
  if (typeof window === "undefined") return
  const snap: FavoritesSnapshot = { version: 1, items }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
}

function emitChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(EVENT_NAME))
}

function ensureInitialized() {
  if (initialized) return
  cachedItems = readFromStorage()
  initialized = true
}

function setCache(next: NewsItem[]) {
  cachedItems = next
}

export function getFavorites(): NewsItem[] {
  ensureInitialized()
  return cachedItems
}

export function isFavorite(id: string): boolean {
  ensureInitialized()
  return cachedItems.some((i) => i.id === id)
}

export function toggleFavorite(item: NewsItem) {
  ensureInitialized()
  const current = cachedItems
  const exists = current.some((i) => i.id === item.id)
  const next = exists ? current.filter((i) => i.id !== item.id) : [item, ...current]
  writeToStorage(next)
  setCache(next)
  emitChange()
}

export function removeFavorite(id: string) {
  ensureInitialized()
  const current = cachedItems
  const next = current.filter((i) => i.id !== id)
  writeToStorage(next)
  setCache(next)
  emitChange()
}

export function clearFavorites() {
  writeToStorage([])
  setCache([])
  emitChange()
}

export function subscribeFavorites(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  ensureInitialized()

  const handler = () => {
    const next = readFromStorage()
    // Avoid notifying if nothing actually changed
    if (next.length === cachedItems.length && next.every((v, i) => v?.id === cachedItems[i]?.id)) return
    setCache(next)
    callback()
  }
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener("storage", handler)
  }
}
