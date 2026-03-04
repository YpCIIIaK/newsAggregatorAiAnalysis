"use client"

import { Newspaper, TrendingUp, Cpu, BarChart3, Globe, BriefcaseBusiness, FlaskConical, Bitcoin } from "lucide-react"
import { type NewsCategory, type NewsItem } from "@/lib/news-sources"
import { useI18n } from "@/lib/i18n-provider"
import { categoryKey } from "@/lib/i18n"

interface StatsBarProps {
  news: Record<NewsCategory, NewsItem[]>
  sourceCounts: Record<string, number>
}

const categoryIcons: Record<NewsCategory, React.ReactNode> = {
  politics: <Newspaper className="size-4" />,
  world: <Globe className="size-4" />,
  business: <BriefcaseBusiness className="size-4" />,
  stocks: <TrendingUp className="size-4" />,
  technology: <Cpu className="size-4" />,
  science: <FlaskConical className="size-4" />,
  crypto: <Bitcoin className="size-4" />,
}

const categoryColors: Record<NewsCategory, string> = {
  politics: "text-destructive",
  world: "text-warning",
  business: "text-accent",
  stocks: "text-success",
  technology: "text-primary",
  science: "text-muted-foreground",
  crypto: "text-warning",
}

export function StatsBar({ news, sourceCounts }: StatsBarProps) {
  const { t } = useI18n()

  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-[1600px] px-4 py-2 flex items-center gap-6 overflow-x-auto">
        {(["politics", "world", "business", "stocks", "technology", "science", "crypto"] as NewsCategory[]).map((cat) => (
          <div key={cat} className="flex items-center gap-2 shrink-0">
            <span className={categoryColors[cat]}>{categoryIcons[cat]}</span>
            <span className="text-xs text-foreground font-medium">{t(categoryKey(cat))}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {news[cat]?.length || 0}
            </span>
          </div>
        ))}

        <div className="border-l border-border h-4" />

        <div className="flex items-center gap-1.5 shrink-0">
          <BarChart3 className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("stats.top")}</span>
        </div>

        {topSources.map(([source, count]) => (
          <div key={source} className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{source}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">({count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
