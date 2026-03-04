"use client"

import { type NewsItem } from "@/lib/news-sources"
import { ExternalLink, Clock, CheckCircle2, Circle, Link2, Bookmark } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n-provider"
import { useFavorites } from "@/hooks/use-favorites"
import { useEffect, useState } from "react"

function timeAgo(dateStr: string, lang: "ru" | "en", t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (isNaN(diffMin) || diffMin < 0) return t("time.justNow")
  if (diffMin < 1) return t("time.justNow")
  if (diffMin < 60) return t("time.minAgo", { count: diffMin })
  if (diffHours < 24) return t("time.hourAgo", { count: diffHours })
  if (diffDays < 7) return t("time.dayAgo", { count: diffDays })
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" })
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

const sourceColors: Record<string, string> = {
  "Hacker News": "bg-[#ff6600]/15 text-[#ff6600] border-[#ff6600]/20",
  "TechCrunch": "bg-[#0a9e01]/15 text-[#0a9e01] border-[#0a9e01]/20",
  "The Verge": "bg-primary/15 text-primary border-primary/20",
  "Ars Technica": "bg-[#ff4400]/15 text-[#ff4400] border-[#ff4400]/20",
  "BBC Politics": "bg-[#bb1919]/15 text-[#bb1919] border-[#bb1919]/20",
  "BBC World": "bg-[#bb1919]/15 text-[#bb1919] border-[#bb1919]/20",
  "Reuters Politics": "bg-[#ff8800]/15 text-[#ff8800] border-[#ff8800]/20",
  "Reuters World": "bg-[#ff8800]/15 text-[#ff8800] border-[#ff8800]/20",
  "NY Times Politics": "bg-foreground/10 text-foreground border-foreground/20",
  "NY Times World": "bg-foreground/10 text-foreground border-foreground/20",
  "CNBC": "bg-[#005e9e]/15 text-[#4da3d4] border-[#005e9e]/20",
  "MarketWatch": "bg-[#00ac4e]/15 text-[#00ac4e] border-[#00ac4e]/20",
  "Yahoo Finance": "bg-[#6001d2]/15 text-[#a855f7] border-[#6001d2]/20",
  "WIRED": "bg-foreground/10 text-foreground border-foreground/20",
  "Engadget": "bg-[#0089d6]/15 text-[#0089d6] border-[#0089d6]/20",
}

interface NewsCardProps {
  item: NewsItem
  selected?: boolean
  highlighted?: boolean
  isNew?: boolean
  onToggleSelect?: (item: NewsItem) => void
}

export function NewsCard({ item, selected, highlighted, isNew, onToggleSelect }: NewsCardProps) {
  const { lang, t } = useI18n()
  const fav = useFavorites()
  const storeFav = fav.isFav(item.id)
  const [optimisticFav, setOptimisticFav] = useState<boolean>(storeFav)

  useEffect(() => {
    setOptimisticFav(storeFav)
  }, [storeFav])
  const badgeClass = sourceColors[item.source] || "bg-secondary text-secondary-foreground border-border"
  const cleanDescription = item.description ? stripHtml(item.description) : ""

  return (
    <div
      className={`group flex flex-col gap-2.5 rounded-lg border p-4 transition-all ${
        isNew
          ? "ring-1 ring-success/20 bg-success/5 animate-in fade-in slide-in-from-top-1 duration-500"
          : ""
      } ${
        highlighted
          ? "border-accent bg-accent/10 shadow-md shadow-accent/10 ring-1 ring-accent/30"
          : selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
      }`}
    >
      {/* Highlighted badge */}
      {highlighted && (
        <div className="flex items-center gap-1.5 -mt-1 mb-0.5">
          <Link2 className="size-3 text-accent" />
          <span className="text-[10px] font-semibold text-accent">{t("card.aiFound")}</span>
        </div>
      )}
      {/* Title row */}
      <div className="flex items-start gap-2">
        {onToggleSelect && (
          <button
            onClick={() => onToggleSelect(item)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
            title={selected ? t("card.removeFromAnalysis") : t("card.addToAnalysis")}
            aria-label={selected ? t("card.removeFromAnalysis") : t("card.addToAnalysis")}
          >
            {selected ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <Circle className="size-4" />
            )}
          </button>
        )}
        <h3
          className={`text-sm font-medium leading-snug flex-1 text-balance line-clamp-2 ${
            selected ? "text-primary" : "text-foreground"
          }`}
        >
          {item.title}
        </h3>

        <button
          type="button"
          onClick={() => {
            setOptimisticFav((v) => !v)
            fav.toggle(item)
          }}
          className={`mt-0.5 shrink-0 rounded-md border px-2 py-1 text-[10px] transition-colors ${
            optimisticFav
              ? "border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
          }`}
          title={optimisticFav ? t("favorites.remove") : t("favorites.add")}
          aria-label={optimisticFav ? t("favorites.remove") : t("favorites.add")}
        >
          <Bookmark className={`size-3.5 ${optimisticFav ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Description */}
      {cleanDescription && cleanDescription.length > 10 && (
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {cleanDescription}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center gap-2 mt-auto">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 font-medium shrink-0 ${badgeClass}`}
        >
          {item.source}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
          <Clock className="size-2.5" />
          {timeAgo(item.publishedAt, lang, t)}
        </span>
        {/* Separate external link button */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary shrink-0"
          title={t("card.openSource")}
        >
          <ExternalLink className="size-3" />
          <span className="hidden sm:inline">{t("card.source")}</span>
        </a>
      </div>
    </div>
  )
}

export function NewsCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 bg-secondary rounded w-full" />
      <div className="h-3 bg-secondary rounded w-5/6" />
      <div className="h-3 bg-secondary rounded w-3/4" />
      <div className="h-3 bg-secondary rounded w-1/2" />
      <div className="flex items-center gap-2 mt-auto">
        <div className="h-4 w-20 bg-secondary rounded" />
        <div className="h-3 w-16 bg-secondary rounded ml-auto" />
      </div>
    </div>
  )
}
