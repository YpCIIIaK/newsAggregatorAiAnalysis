"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type NewsItem, type NewsCategory } from "@/lib/news-sources"
import { useI18n } from "@/lib/i18n-provider"
import { categoryKey } from "@/lib/i18n"
import {
  Brain, Zap, TrendingUp, ArrowRight, Loader2, AlertTriangle,
  Sparkles, X, Crosshair, Layers, Link2
} from "lucide-react"

interface Correlation {
  title: string
  description: string
  categories: NewsCategory[]
  impact: "high" | "medium" | "low"
  sentiment: "positive" | "negative" | "neutral"
}

interface MultiAnalysisResult {
  correlations: Correlation[]
  summary: string
  marketImpact: string
}

interface SingleConnection {
  title: string
  description: string
  relatedCategory: NewsCategory
  relatedIndex: number
  strength: "strong" | "moderate" | "weak"
  impact: "high" | "medium" | "low"
}

interface SingleAnalysisResult {
  relatedIndices: Record<string, number[]>
  connections: SingleConnection[]
  summary: string
}

type AnalysisMode = "single" | "multi"

interface CorrelationPanelProps {
  news: Record<NewsCategory, NewsItem[]>
  loading: boolean
  hasHighlights?: boolean
  selectedItems: NewsItem[]
  onClearSelection: () => void
  onHighlightRelated?: (ids: Set<string>) => void
}

type NewsSnippet = {
  title: string
  description?: string
  source?: string
  url?: string
  publishedAt?: string
}

const impactColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/20",
  medium: "bg-warning/15 text-warning border-warning/20",
  low: "bg-primary/15 text-primary border-primary/20",
}

const strengthColors: Record<string, string> = {
  strong: "bg-success/15 text-success border-success/20",
  moderate: "bg-warning/15 text-warning border-warning/20",
  weak: "bg-muted text-muted-foreground border-border",
}

const sentimentIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="size-3.5 text-success" />,
  negative: <TrendingUp className="size-3.5 text-destructive rotate-180" />,
  neutral: <ArrowRight className="size-3.5 text-muted-foreground" />,
}

export function CorrelationPanel({
  news,
  loading: newsLoading,
  hasHighlights,
  selectedItems,
  onClearSelection,
  onHighlightRelated,
}: CorrelationPanelProps) {
  const { t } = useI18n()

  const [mode, setMode] = useState<AnalysisMode>("single")
  const [includeSameCategory, setIncludeSameCategory] = useState(false)
  const allCategories: NewsCategory[] = ["politics", "world", "business", "stocks", "technology", "science", "crypto"]
  const [analysisCategories, setAnalysisCategories] = useState<Set<NewsCategory>>(
    () => new Set(allCategories)
  )
  const [multiAnalysis, setMultiAnalysis] = useState<MultiAnalysisResult | null>(null)
  const [singleAnalysis, setSingleAnalysis] = useState<SingleAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string>("")

  const analysisCategoryList = allCategories.filter((c) => analysisCategories.has(c))

  const hasNews = Object.values(news).some((items) => items.length > 0)

  // For single mode: need exactly 1 selected item
  const canRunSingle = mode === "single" && selectedItems.length === 1
  // For multi mode: need 2+ selected or use all
  const canRunMulti = mode === "multi" && (selectedItems.length >= 2 || hasNews)

  async function runSingleAnalysis() {
    if (selectedItems.length !== 1) return
    const item = selectedItems[0]
    setAnalyzing(true)
    setError(null)
    setSingleAnalysis(null)

    // Build headlines for other categories
    const allHeadlines: Record<string, NewsSnippet[]> = {}
    for (const cat of analysisCategoryList) {
      if (!includeSameCategory && cat === item.category) continue
      if (cat === item.category && includeSameCategory && !analysisCategories.has(item.category)) continue
      allHeadlines[cat] = (news[cat] || [])
        .filter((n) => !(cat === item.category && n.id === item.id))
        .map((n) => ({
        title: n.title, 
        description: n.description,
        source: n.source,
        url: n.url,
        publishedAt: n.publishedAt,
      }))
    }

    try {
      const res = await fetch("/api/correlate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          analysisCategories: analysisCategoryList,
          includeSameCategory,
          focusItem: {
            title: item.title,
            description: item.description?.substring(0, 200) || "",
            category: item.category,
          },
          allHeadlines,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("common.errorRequest"))
      }

      const data = await res.json()
      setSingleAnalysis(data.analysis)
      if (data.model) setModel(data.model)

      // Highlight related news items in the feeds
      if (data.analysis?.relatedIndices && onHighlightRelated) {
        const relatedIds = new Set<string>()
        for (const [cat, indices] of Object.entries(data.analysis.relatedIndices)) {
          const catItems = news[cat as NewsCategory]
          if (catItems && Array.isArray(indices)) {
            for (const idx of indices as number[]) {
              if (catItems[idx]) {
                if (catItems[idx].id !== item.id) relatedIds.add(catItems[idx].id)
              }
            }
          }
        }
        onHighlightRelated(relatedIds)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.errorAnalysis"))
    } finally {
      setAnalyzing(false)
    }
  }

  async function runMultiAnalysis() {
    setAnalyzing(true)
    setError(null)
    setMultiAnalysis(null)

    const useSelected = selectedItems.length >= 2
    let headlines: Record<string, string[]>
    let itemsByCategory: Record<string, NewsSnippet[]>

    if (useSelected) {
      headlines = {}
      itemsByCategory = {}
      for (const cat of analysisCategoryList) {
        headlines[cat] = []
        itemsByCategory[cat] = []
      }
      for (const item of selectedItems) {
        if (!analysisCategories.has(item.category)) continue
        const desc = item.description ? ` - ${item.description.substring(0, 100)}` : ""
        headlines[item.category]?.push(`${item.title}${desc}`)
        itemsByCategory[item.category]?.push({
          title: item.title,
          description: item.description,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
        })
      }
    } else {
      headlines = {}
      itemsByCategory = {}
      for (const cat of analysisCategoryList) {
        headlines[cat] = news[cat]?.slice(0, 10).map((n) => {
          const desc = n.description ? ` - ${n.description.substring(0, 100)}` : ""
          return `${n.title}${desc}`
        }) || []

        itemsByCategory[cat] = (news[cat] || []).map((n) => ({
          title: n.title,
          description: n.description,
          source: n.source,
          url: n.url,
          publishedAt: n.publishedAt,
        }))
      }
    }

    try {
      const res = await fetch("/api/correlate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headlines, itemsByCategory, mode: "multi", analysisCategories: analysisCategoryList }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("common.errorRequest"))
      }

      const data = await res.json()
      setMultiAnalysis(data.analysis)
      if (data.model) setModel(data.model)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.errorAnalysis"))
    } finally {
      setAnalyzing(false)
    }
  }

  function handleAnalyze() {
    if (mode === "single") runSingleAnalysis()
    else runMultiAnalysis()
  }

  const isDisabled = analyzing || newsLoading || !hasNews || (mode === "single" && !canRunSingle)

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-5 text-primary" />
            {t("ai.title")}
          </CardTitle>

          {hasHighlights && onHighlightRelated && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onHighlightRelated(new Set())}
              title={t("ai.clearHighlightsTitle")}
            >
              {t("ai.clearHighlights")}
            </Button>
          )}
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 mt-2">
          <button
            onClick={() => { setMode("single"); setMultiAnalysis(null); onHighlightRelated?.(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
              mode === "single"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crosshair className="size-3.5" />
            {t("ai.mode.single")}
          </button>
          <button
            onClick={() => { setMode("multi"); setSingleAnalysis(null); onHighlightRelated?.(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
              mode === "multi"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-3.5" />
            {t("ai.mode.multi")}
          </button>
        </div>

        {model && (
          <p className="text-[10px] font-mono text-muted-foreground mt-1">
            {t("ai.model", { model })}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Mode description */}
        <div className="mb-3 rounded-lg border border-border bg-secondary/20 p-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {mode === "single"
              ? t("ai.singleHint")
              : t("ai.multiHint")}
          </p>

          {mode === "single" && (
            <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={includeSameCategory}
                onChange={(e) => setIncludeSameCategory(e.target.checked)}
              />
              {t("ai.includeSameCategory")}
            </label>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{t("ai.categoriesForSearch")}</span>
            <button
              type="button"
              className="text-[11px] text-muted-foreground underline underline-offset-2"
              onClick={() => setAnalysisCategories(new Set(allCategories))}
            >
              {t("ai.selectAll")}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {allCategories.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={analysisCategories.has(cat)}
                  onChange={(e) => {
                    setAnalysisCategories((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) {
                        next.add(cat)
                        return next
                      }
                      if (next.size <= 1) return prev
                      next.delete(cat)
                      return next
                    })
                  }}
                />
                {t(categoryKey(cat))}
              </label>
            ))}
          </div>
        </div>

        {/* Selected items */}
        {selectedItems.length > 0 && (
          <div className={`mb-3 rounded-lg border p-3 ${
            mode === "single" && selectedItems.length === 1
              ? "border-primary/30 bg-primary/5"
              : mode === "single" && selectedItems.length > 1
              ? "border-destructive/30 bg-destructive/5"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">
                {mode === "single"
                  ? selectedItems.length === 1
                    ? t("ai.selected.single")
                    : t("ai.selected.singleNeed1", { count: selectedItems.length })
                  : t("ai.selected.multi", { count: selectedItems.length })}
              </p>
              <button
                onClick={() => { onClearSelection(); onHighlightRelated?.(new Set()); setSingleAnalysis(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t("ai.clearSelectionTitle")}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {selectedItems.slice(0, mode === "single" ? 1 : 8).map((item) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {t(categoryKey(item.category))}
                  </Badge>
                  <span className="text-xs text-foreground truncate">
                    {item.title}
                  </span>
                </div>
              ))}
              {mode === "multi" && selectedItems.length > 8 && (
                <span className="text-[10px] text-muted-foreground">
                  {t("common.more", { count: selectedItems.length - 8 })}
                </span>
              )}
            </div>
            {mode === "single" && selectedItems.length > 1 && (
              <p className="text-[10px] text-destructive mt-1.5">
                {t("ai.selected.tooMany")}
              </p>
            )}
          </div>
        )}

        {/* Analyze button */}
        <Button
          onClick={handleAnalyze}
          disabled={isDisabled}
          size="sm"
          className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 mb-3"
        >
          {analyzing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {mode === "single" ? t("ai.loading.single") : t("ai.loading.multi")}
            </>
          ) : (
            <>
              {mode === "single" ? <Crosshair className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {mode === "single" ? t("ai.button.findRelated") : t("ai.button.analyze")}
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-3">
            <AlertTriangle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!singleAnalysis && !multiAnalysis && !analyzing && !error && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-3">
            <div className="relative">
              <Brain className="size-10 text-primary/20" />
              <Zap className="size-4 text-primary/40 absolute -right-1 -top-1" />
            </div>
            <p className="text-xs text-center text-balance max-w-xs">
              {mode === "single"
                ? t("ai.empty.single")
                : t("ai.empty.multi")}
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              DeepSeek R1 via OpenRouter
            </p>
          </div>
        )}

        {/* Loading state */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="relative">
              <Brain className="size-10 text-primary animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "single" ? t("ai.loading.single") : t("ai.loading.multi")}
            </p>
            <div className="flex gap-1">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <div className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
              <div className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Single analysis result */}
        {singleAnalysis && !analyzing && mode === "single" && (
          <div className="flex flex-col gap-3">
            {singleAnalysis.summary && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  {t("ai.result.summary")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {singleAnalysis.summary}
                </p>
              </div>
            )}

            {singleAnalysis.connections?.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-foreground px-1 flex items-center gap-1.5">
                  <Link2 className="size-3 text-primary" />
                  {t("ai.result.connections", { count: singleAnalysis.connections.length })}
                </p>
                {singleAnalysis.connections.map((conn, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-foreground flex-1">
                        {conn.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${strengthColors[conn.strength] || strengthColors.weak}`}
                        >
                          {t(
                            conn.strength === "strong" ? "strength.strong"
                              : conn.strength === "moderate" ? "strength.moderate"
                              : "strength.weak"
                          )}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${impactColors[conn.impact] || impactColors.low}`}
                        >
                          {t(
                            conn.impact === "high" ? "impact.high"
                              : conn.impact === "medium" ? "impact.medium"
                              : "impact.low"
                          )}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {conn.description}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 w-fit"
                    >
                      {t(categoryKey(conn.relatedCategory))}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">{t("ai.result.none")}</p>
              </div>
            )}
          </div>
        )}

        {/* Multi analysis result */}
        {multiAnalysis && !analyzing && mode === "multi" && (
          <div className="flex flex-col gap-3">
            {multiAnalysis.summary && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  {t("ai.multi.summary")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {multiAnalysis.summary}
                </p>
              </div>
            )}

            {multiAnalysis.marketImpact && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="size-3 text-primary" />
                  {t("ai.multi.marketImpact")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {multiAnalysis.marketImpact}
                </p>
              </div>
            )}

            {multiAnalysis.correlations?.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-foreground px-1">
                  {t("ai.multi.correlations", { count: multiAnalysis.correlations.length })}
                </p>
                {multiAnalysis.correlations.map((corr, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {sentimentIcons[corr.sentiment] || sentimentIcons.neutral}
                        <span className="text-xs font-medium text-foreground">
                          {corr.title}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 shrink-0 ${impactColors[corr.impact] || impactColors.low}`}
                      >
                        {t(
                          corr.impact === "high" ? "impact.high"
                            : corr.impact === "medium" ? "impact.medium"
                            : "impact.low"
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {corr.description}
                    </p>
                    <div className="flex gap-1.5">
                      {corr.categories?.map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0"
                        >
                          {t(categoryKey(cat))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
