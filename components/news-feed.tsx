"use client"

import { type NewsItem, type NewsCategory } from "@/lib/news-sources"
import { NewsCard, NewsCardSkeleton } from "@/components/news-card"
import { Newspaper, TrendingUp, Cpu, AlertCircle, Globe, BriefcaseBusiness, FlaskConical, Bitcoin } from "lucide-react"
import { useI18n } from "@/lib/i18n-provider"
import { categoryKey } from "@/lib/i18n"

const categoryConfig: Record<NewsCategory, { label: string; icon: React.ReactNode; color: string }> = {
  politics: {
    label: "politics",
    icon: <Newspaper className="size-4" />,
    color: "text-destructive",
  },
  world: {
    label: "world",
    icon: <Globe className="size-4" />,
    color: "text-warning",
  },
  business: {
    label: "business",
    icon: <BriefcaseBusiness className="size-4" />,
    color: "text-accent",
  },
  stocks: {
    label: "stocks",
    icon: <TrendingUp className="size-4" />,
    color: "text-success",
  },
  technology: {
    label: "technology",
    icon: <Cpu className="size-4" />,
    color: "text-primary",
  },
  science: {
    label: "science",
    icon: <FlaskConical className="size-4" />,
    color: "text-muted-foreground",
  },
  crypto: {
    label: "crypto",
    icon: <Bitcoin className="size-4" />,
    color: "text-warning",
  },
}

interface NewsFeedProps {
  category: NewsCategory
  items: NewsItem[]
  loading: boolean
  selectedIds?: Set<string>
  highlightedIds?: Set<string>
  newIds?: Set<string>
  onToggleSelect?: (item: NewsItem) => void
}

export function NewsFeed({ category, items, loading, selectedIds, highlightedIds, newIds, onToggleSelect }: NewsFeedProps) {
  const { t } = useI18n()
  const config = categoryConfig[category]
  const highlightedCount = items.filter(i => highlightedIds?.has(i.id)).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1 sticky top-0 bg-background z-10 py-2">
        <span className={config.color}>{config.icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{t(categoryKey(category))}</h2>
        {highlightedCount > 0 && (
          <span className="text-[10px] font-semibold text-accent bg-accent/15 px-1.5 py-0.5 rounded">
            {t("feed.relatedCount", { count: highlightedCount })}
          </span>
        )}
        {!loading && (
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {items.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))
        ) : items.length > 0 ? (
          // Sort: highlighted items first, then the rest
          [...items]
            .sort((a, b) => {
              const aH = highlightedIds?.has(a.id) ? 1 : 0
              const bH = highlightedIds?.has(b.id) ? 1 : 0
              return bH - aH
            })
            .map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              selected={selectedIds?.has(item.id)}
              highlighted={highlightedIds?.has(item.id)}
              isNew={newIds?.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <AlertCircle className="size-8" />
            <p className="text-sm">{t("feed.noData")}</p>
            <p className="text-xs">{t("feed.noDataSub")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
