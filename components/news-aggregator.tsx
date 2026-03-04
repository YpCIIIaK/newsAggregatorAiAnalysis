"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import useSWR from "swr"
import { type NewsItem, type NewsCategory } from "@/lib/news-sources"
import { Header } from "@/components/header"
import { StatsBar } from "@/components/stats-bar"
import { NewsFeed } from "@/components/news-feed"
import { CorrelationPanel } from "@/components/correlation-panel"
import { Button } from "@/components/ui/button"
import { NewsCard } from "@/components/news-card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, LayoutGrid, List } from "lucide-react"
import { useI18n } from "@/lib/i18n-provider"
import { categoryKey } from "@/lib/i18n"

interface NewsResponse {
  news: Record<NewsCategory, NewsItem[]>
  totalItems: number
  sources: number
  sourceCounts: Record<string, number>
  fetchedAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NewsAggregator() {
  const { t } = useI18n()

  const { data, isLoading, mutate } = useSWR<NewsResponse>("/api/news", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 600000,
    dedupingInterval: 60000,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<NewsItem[]>([])
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  const [feedMode, setFeedMode] = useState<"mixed" | "categories">("categories")
  const [selectedCategories, setSelectedCategories] = useState<NewsCategory[]>([
    "politics",
    "stocks",
    "technology",
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<"24h" | "48h" | "7d" | "all">("48h")

  const news = data?.news || { politics: [], world: [], business: [], stocks: [], technology: [], science: [], crypto: [] }
  const totalItems = data?.totalItems || 0
  const sources = data?.sources || 0
  const sourceCounts = data?.sourceCounts || {}
  const fetchedAt = data?.fetchedAt || null

  const allCategories: NewsCategory[] = [
    "politics",
    "world",
    "business",
    "stocks",
    "technology",
    "science",
    "crypto",
  ]

  const combinedItems = useMemo(() => {
    const items = Object.values(news).flat()
    return [...items].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      if (isNaN(dateA) && isNaN(dateB)) return 0
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateB - dateA
    })
  }, [news])

  const sourceOptions = useMemo(() => {
    return Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
  }, [sourceCounts])

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const hasSourceFilter = selectedSources.size > 0

    let cutoffMs: number | null = null
    const now = Date.now()
    if (timeRange === "24h") cutoffMs = now - 24 * 60 * 60 * 1000
    if (timeRange === "48h") cutoffMs = now - 48 * 60 * 60 * 1000
    if (timeRange === "7d") cutoffMs = now - 7 * 24 * 60 * 60 * 1000

    const passes = (it: NewsItem) => {
      if (q) {
        const hay = `${it.title || ""} ${it.description || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      if (hasSourceFilter && !selectedSources.has(it.source)) return false

      if (cutoffMs !== null) {
        const t = new Date(it.publishedAt).getTime()
        if (!Number.isFinite(t) || t < cutoffMs) return false
      }

      return true
    }

    const out: Record<NewsCategory, NewsItem[]> = {
      politics: [],
      world: [],
      business: [],
      stocks: [],
      technology: [],
      science: [],
      crypto: [],
    }

    for (const cat of Object.keys(out) as NewsCategory[]) {
      out[cat] = (news[cat] || []).filter(passes)
    }

    return out
  }, [news, searchQuery, selectedSources, timeRange])

  const filteredCombinedItems = useMemo(() => {
    const items = Object.values(filteredNews).flat()
    return [...items].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      if (isNaN(dateA) && isNaN(dateB)) return 0
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateB - dateA
    })
  }, [filteredNews])

  const prevIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const prev = prevIdsRef.current
    const next = new Set(combinedItems.map((i) => i.id))
    const added = new Set<string>()
    for (const id of next) {
      if (!prev.has(id)) added.add(id)
    }

    prevIdsRef.current = next

    if (added.size > 0) {
      setNewIds(added)
      window.setTimeout(() => setNewIds(new Set()), 8000)
    }
  }, [combinedItems])

  const mixedColumns = useMemo(() => {
    const cols: NewsItem[][] = [[], [], []]
    for (let i = 0; i < filteredCombinedItems.length; i++) {
      cols[i % 3].push(filteredCombinedItems[i])
    }
    return cols
  }, [filteredCombinedItems])

  const categoryColumns = useMemo(() => {
    const cats = selectedCategories.slice(0, 3)
    return cats.map((c) => filteredNews[c] || [])
  }, [filteredNews, selectedCategories])

  const toggleSource = useCallback((src: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev)
      if (next.has(src)) next.delete(src)
      else next.add(src)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedSources(new Set())
    setTimeRange("48h")
  }, [])

  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  const handleToggleSelect = useCallback((item: NewsItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.add(item.id)
      }
      return next
    })
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      if (exists) return prev.filter((i) => i.id !== item.id)
      return [...prev, item]
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedItems([])
    setHighlightedIds(new Set())
  }, [])

  const handleHighlightRelated = useCallback((ids: Set<string>) => {
    setHighlightedIds(ids)
  }, [])

  const handleToggleCategory = useCallback((cat: NewsCategory) => {
    setSelectedCategories((prev) => {
      const has = prev.includes(cat)
      if (has) return prev.filter((c) => c !== cat)
      if (prev.length >= 3) return prev
      return [...prev, cat]
    })
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        totalItems={totalItems}
        sources={sources}
        fetchedAt={fetchedAt}
        loading={isLoading}
      />

      {!isLoading && data && (
        <StatsBar news={news} sourceCounts={sourceCounts} />
      )}

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-4">
        {/* Controls */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="hidden md:flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setFeedMode("categories")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  feedMode === "categories"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                {t("feed.mode.categories")}
              </button>
              <button
                onClick={() => setFeedMode("mixed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  feedMode === "mixed"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                {t("feed.mode.mixed")}
              </button>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-medium">
                  {t("controls.selected")}: {selectedItems.length}
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("controls.reset")}
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-1.5 ml-auto"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {t("controls.refresh")}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                <SelectTrigger className="h-9" size="sm">
                  <SelectValue placeholder={t("filters.timeRange")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{t("filters.time.24h")}</SelectItem>
                  <SelectItem value="48h">{t("filters.time.48h")}</SelectItem>
                  <SelectItem value="7d">{t("filters.time.7d")}</SelectItem>
                  <SelectItem value="all">{t("filters.time.all")}</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9">
                    {t("filters.sources")} {selectedSources.size > 0 ? `(${selectedSources.size})` : ""}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <div className="text-xs font-medium text-foreground mb-2">{t("filters.sources")}</div>
                  <div className="max-h-56 overflow-auto flex flex-col gap-2">
                    {sourceOptions.map((src) => {
                      const checked = selectedSources.has(src)
                      return (
                        <label key={src} className="flex items-center gap-2 text-xs text-foreground">
                          <Checkbox checked={checked} onCheckedChange={() => toggleSource(src)} />
                          <span className="flex-1 line-clamp-1" title={src}>{src}</span>
                        </label>
                      )
                    })}
                    {sourceOptions.length === 0 && (
                      <div className="text-xs text-muted-foreground">{t("filters.sourcesEmpty")}</div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSources(new Set())}>
                      {t("filters.clearSources")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button type="button" variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                {t("filters.reset")}
              </Button>
            </div>
          </div>

          {feedMode === "categories" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {allCategories.map((cat) => {
                const active = selectedCategories.includes(cat)
                const disabled = !active && selectedCategories.length >= 3
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    disabled={disabled}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : disabled
                        ? "border-border bg-secondary/20 text-muted-foreground/60 cursor-not-allowed"
                        : "border-border bg-secondary/20 text-muted-foreground hover:text-foreground"
                    }`}
                    title={disabled ? t("feed.max3") : ""}
                  >
                    {t(categoryKey(cat))}
                  </button>
                )
              })}
              <span className="text-[10px] text-muted-foreground ml-1">
                {t("feed.selectedCount", { count: selectedCategories.length })}
              </span>
            </div>
          )}
        </div>

        {/* 3 columns + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {feedMode === "mixed" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mixedColumns.map((col, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    {col.map((item) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        selected={selectedIds.has(item.id)}
                        highlighted={highlightedIds.has(item.id)}
                        isNew={newIds.has(item.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categoryColumns.map((items, idx) => {
                  const cat = selectedCategories[idx] || "politics"
                  return (
                    <NewsFeed
                      key={`${cat}-${idx}`}
                      category={cat}
                      items={items}
                      loading={isLoading}
                      selectedIds={selectedIds}
                      highlightedIds={highlightedIds}
                      newIds={newIds}
                      onToggleSelect={handleToggleSelect}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <CorrelationPanel
              news={news}
              loading={isLoading}
              hasHighlights={highlightedIds.size > 0}
              selectedItems={selectedItems}
              onClearSelection={handleClearSelection}
              onHighlightRelated={handleHighlightRelated}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card/30 py-2 mt-8">
        <div className="mx-auto max-w-[1600px] px-4 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{t("footer.left")}</span>
          <span>{t("footer.right", { model: process.env.NEXT_PUBLIC_OPENROUTER_MODEL || "qwen/qwen3-vl-235b-a22b-thinking" })}</span>
        </div>
      </footer>
    </div>
  )
}
