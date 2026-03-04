"use client"

import { useState } from "react"
import { Activity, Radio, Database, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-provider"
import { useFavorites } from "@/hooks/use-favorites"
import { SavedNewsSheet } from "@/components/saved-news-sheet"

interface HeaderProps {
  totalItems: number
  sources: number
  fetchedAt: string | null
  loading: boolean
}

export function Header({ totalItems, sources, fetchedAt, loading }: HeaderProps) {
  const { lang, setLang, t } = useI18n()
  const fav = useFavorites()
  const [savedOpen, setSavedOpen] = useState(false)

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--"

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              NewsFlow
            </h1>
          </div>
          <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-3">
            {t("app.tagline")}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {loading ? (
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>{t("header.loading")}</span>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-1.5">
                <Database className="size-3" />
                <span className="font-mono">{sources} {t("header.sources")}</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                <Radio className="size-3" />
                <span className="font-mono">{totalItems} {t("header.news")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-success animate-pulse" />
                <span className="font-mono">{formattedTime}</span>
              </div>
            </>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1"
              onClick={() => setSavedOpen(true)}
              title={t("favorites.title")}
            >
              <Bookmark className="size-3.5" />
              <span className="font-mono">{fav.count}</span>
            </Button>

            <Button
              type="button"
              variant={lang === "ru" ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setLang("ru")}
            >
              RU
            </Button>
            <Button
              type="button"
              variant={lang === "en" ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => setLang("en")}
            >
              EN
            </Button>
          </div>
        </div>
      </div>

      <SavedNewsSheet open={savedOpen} onOpenChange={setSavedOpen} />
    </header>
  )
}
