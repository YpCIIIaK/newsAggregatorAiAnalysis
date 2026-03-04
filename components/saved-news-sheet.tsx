"use client"

import { ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useFavorites } from "@/hooks/use-favorites"
import { useI18n } from "@/lib/i18n-provider"

export function SavedNewsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const fav = useFavorites()

  const items = [...fav.items].sort((a, b) => {
    const da = new Date(a.publishedAt).getTime()
    const db = new Date(b.publishedAt).getTime()
    if (isNaN(da) && isNaN(db)) return 0
    if (isNaN(da)) return 1
    if (isNaN(db)) return -1
    return db - da
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-2 pr-10">
            <SheetTitle>{t("favorites.title")}</SheetTitle>
            {fav.count > 0 && (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={fav.clear}>
                {t("favorites.clear")}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-2 p-4 overflow-auto">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("favorites.empty")}</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-3 flex gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                  {item.description && (
                    <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                      {item.description}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">{item.source}</div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center justify-center size-8 rounded-md border border-border hover:border-primary/40"
                  title={t("card.openSource")}
                >
                  <ExternalLink className="size-4" />
                </a>

                <button
                  type="button"
                  onClick={() => fav.remove(item.id)}
                  className="shrink-0 inline-flex items-center justify-center size-8 rounded-md border border-border hover:border-destructive/40"
                  title={t("favorites.remove")}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
