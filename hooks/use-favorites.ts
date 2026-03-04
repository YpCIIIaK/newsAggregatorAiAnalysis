"use client"

import { useCallback, useSyncExternalStore } from "react"
import { type NewsItem } from "@/lib/news-sources"
import {
  clearFavorites,
  getFavorites,
  removeFavorite,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites-store"

const EMPTY: NewsItem[] = []

export function useFavorites() {
  const items = useSyncExternalStore(subscribeFavorites, getFavorites, () => EMPTY)

  const isFav = useCallback((id: string) => items.some((i) => i.id === id), [items])
  const toggle = useCallback((item: NewsItem) => toggleFavorite(item), [])
  const remove = useCallback((id: string) => removeFavorite(id), [])
  const clear = useCallback(() => clearFavorites(), [])

  return {
    items,
    count: items.length,
    isFav,
    toggle,
    remove,
    clear,
  }
}
