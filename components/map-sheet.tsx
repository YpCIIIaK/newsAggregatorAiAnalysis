"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, GitBranch, Loader2, Search, SlidersHorizontal } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-provider"
import { type NewsCategory, type NewsItem } from "@/lib/news-sources"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

type ClusterNode = {
  id: string
  label: string
  size: number
  topKeywords: string[]
  categories: Partial<Record<NewsCategory, number>>
  memberIds: string[]
}

type ClusterEdge = {
  source: string
  target: string
  weight: number
  keywords: string[]
}

type GraphResponse = {
  nodes: ClusterNode[]
  links: ClusterEdge[]
  members: Record<string, NewsItem>
}

type EntityType = "company" | "person" | "country"

type EntityNode = {
  id: string
  label: string
  type: EntityType
  count: number
  evidence: number[]
}

type EntityLink = {
  source: string
  target: string
  type: string
  weight: number
  evidence: number[]
}

type EntityGraphResponse = {
  nodes: EntityNode[]
  links: EntityLink[]
  news: NewsItem[]
}

export function MapSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const fgRef = useRef<any>(null)

  const [mode, setMode] = useState<"clusters" | "entities">("clusters")

  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [entityGraph, setEntityGraph] = useState<EntityGraphResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [minWeight, setMinWeight] = useState(0.25)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSelectedNodeId(null)

      try {
        const newsRes = await fetch("/api/news")
        if (!newsRes.ok) throw new Error(await newsRes.text())
        const newsData = await newsRes.json()

        const itemsByCategory = newsData?.news || {}

        if (mode === "clusters") {
          const graphRes = await fetch("/api/graph", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemsByCategory, maxItems: 300, windowHours: 48 }),
          })

          if (!graphRes.ok) {
            const txt = await graphRes.text()
            throw new Error(txt || "Graph error")
          }

          const g = (await graphRes.json()) as GraphResponse
          if (cancelled) return
          setGraph(g)
        } else {
          const entRes = await fetch("/api/entity-graph", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemsByCategory, maxItems: 250, batchSize: 25, concurrency: 3 }),
          })

          if (!entRes.ok) {
            const txt = await entRes.text()
            throw new Error(txt || "Entity graph error")
          }

          const eg = (await entRes.json()) as EntityGraphResponse
          if (cancelled) return
          setEntityGraph(eg)
        }

        // fit to view (small delay to ensure canvas mounted)
        window.setTimeout(() => {
          try {
            fgRef.current?.zoomToFit?.(400, 40)
          } catch {
            // ignore
          }
        }, 150)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : t("common.errorRequest"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [mode, open, t])

  useEffect(() => {
    if (!open) return
    setSelectedNodeId(null)
    setQuery("")
  }, [mode, open])

  const filtered = useMemo(() => {
    if (mode === "clusters") {
      if (!graph) return null

      const q = query.trim().toLowerCase()
      const nodes = q
        ? graph.nodes.filter((n) => {
            const hay = `${n.label} ${n.topKeywords.join(" ")}`.toLowerCase()
            return hay.includes(q)
          })
        : graph.nodes

      const nodeSet = new Set(nodes.map((n) => n.id))

      const links = graph.links.filter((l) => {
        const wOk = l.weight >= minWeight
        const s = typeof l.source === "string" ? l.source : (l.source as any).id
        const tId = typeof l.target === "string" ? l.target : (l.target as any).id
        return wOk && nodeSet.has(s) && nodeSet.has(tId)
      })

      if (q) {
        const connected = new Set<string>()
        for (const l of links) {
          const s = typeof l.source === "string" ? l.source : (l.source as any).id
          const tId = typeof l.target === "string" ? l.target : (l.target as any).id
          connected.add(s)
          connected.add(tId)
        }
        const finalNodes = nodes.filter((n) => connected.has(n.id) || (`${n.label} ${n.topKeywords.join(" ")}`.toLowerCase().includes(q)))
        return { nodes: finalNodes, links }
      }

      return { nodes, links }
    }

    if (!entityGraph) return null
    const q = query.trim().toLowerCase()
    const nodes = q
      ? entityGraph.nodes.filter((n) => {
          const hay = `${n.label} ${n.type}`.toLowerCase()
          return hay.includes(q)
        })
      : entityGraph.nodes

    const nodeSet = new Set(nodes.map((n) => n.id))
    const links = entityGraph.links.filter((l) => {
      const wOk = l.weight >= Math.max(1, Math.round(minWeight * 5))
      const s = typeof l.source === "string" ? l.source : (l.source as any).id
      const tId = typeof l.target === "string" ? l.target : (l.target as any).id
      return wOk && nodeSet.has(s) && nodeSet.has(tId)
    })

    return { nodes, links }
  }, [entityGraph, graph, minWeight, mode, query])

  const selectedCluster = useMemo(() => {
    if (!graph || !selectedNodeId) return null
    return graph.nodes.find((n) => n.id === selectedNodeId) || null
  }, [graph, selectedNodeId])

  const selectedClusterMembers = useMemo(() => {
    if (!graph || !selectedCluster) return []
    const items: NewsItem[] = []
    for (const id of selectedCluster.memberIds) {
      const it = graph.members[id]
      if (it) items.push(it)
    }
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    return items
  }, [graph, selectedCluster])

  const selectedEntity = useMemo(() => {
    if (!entityGraph || !selectedNodeId) return null
    return entityGraph.nodes.find((n) => n.id === selectedNodeId) || null
  }, [entityGraph, selectedNodeId])

  const selectedEntityNews = useMemo(() => {
    if (!entityGraph || !selectedEntity) return []
    const items: NewsItem[] = []
    for (const idx of selectedEntity.evidence || []) {
      const it = entityGraph.news[idx]
      if (it) items.push(it)
    }
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    return items
  }, [entityGraph, selectedEntity])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-2 pr-10">
            <SheetTitle className="flex items-center gap-2">
              <GitBranch className="size-4" />
              {t("map.title")}
            </SheetTitle>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("clusters")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    mode === "clusters" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("map.mode.clusters")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("entities")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    mode === "entities" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("map.mode.entities")}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  try {
                    fgRef.current?.zoomToFit?.(400, 40)
                  } catch {
                    // ignore
                  }
                }}
                title={t("map.fit")}
              >
                {t("map.fit")}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-0 h-[calc(100vh-64px)]">
          <div className="p-3 border-b md:border-b-0 md:border-r border-border flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1 rounded-md border border-border bg-card px-2 py-1.5">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1"
                  placeholder={t("map.search")}
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={minWeight}
                  onChange={(e) => setMinWeight(Number(e.target.value))}
                  className="w-28"
                  aria-label={t("map.minWeight")}
                />
                <span className="text-[11px] font-mono text-muted-foreground w-10 text-right">{minWeight.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">{t("map.loading")}</span>
                </div>
              ) : error ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground px-4 text-sm text-center">
                  {t("map.error")}: {error}
                </div>
              ) : filtered ? (
                <ForceGraph2D
                  ref={fgRef}
                  graphData={filtered}
                  backgroundColor="rgba(0,0,0,0)"
                  nodeRelSize={4}
                  nodeVal={(n: any) => mode === "clusters"
                    ? Math.max(3, Math.min(24, (n.size || 1) * 2))
                    : Math.max(3, Math.min(24, (n.count || 1) * 2))
                  }
                  linkWidth={(l: any) => Math.max(0.5, (l.weight || 0.1) * 2)}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleWidth={(l: any) => Math.max(0.5, (l.weight || 0.1) * 3)}
                  linkDirectionalParticleSpeed={(l: any) => (l.weight || 0.1) * 0.01}
                  nodeColor={(n: any) => (n.id === selectedNodeId ? "#60a5fa" : "#a78bfa")}
                  linkColor={() => "rgba(148,163,184,0.25)"}
                  onNodeClick={(n: any) => setSelectedNodeId(n.id)}
                  nodeLabel={(n: any) => mode === "clusters" ? `${n.label} (${n.size})` : `${n.label} (${n.count})`}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                  {t("map.empty")}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 flex flex-col min-h-0">
            <div className="text-sm font-semibold text-foreground mb-2">
              {mode === "clusters"
                ? (selectedCluster ? selectedCluster.label : t("map.details"))
                : (selectedEntity ? selectedEntity.label : t("map.details"))}
            </div>

            {mode === "clusters" && selectedCluster && (
              <div className="text-[11px] text-muted-foreground mb-2">
                {t("map.clusterSize", { count: selectedCluster.size })}
              </div>
            )}

            {mode === "entities" && selectedEntity && (
              <div className="text-[11px] text-muted-foreground mb-2">
                {t("map.entityMentions", { count: selectedEntity.count })}
              </div>
            )}

            {mode === "clusters" && selectedCluster?.topKeywords?.length ? (
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedCluster.topKeywords.slice(0, 8).map((k) => (
                  <span key={k} className="text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                    {k}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2">
              {(mode === "clusters" ? Boolean(selectedCluster) : Boolean(selectedEntity)) ? (
                (mode === "clusters" ? selectedClusterMembers : selectedEntityNews).slice(0, 40).map((it) => (
                  <a
                    key={it.id}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border bg-card p-2 hover:border-primary/40 transition-colors"
                    title={it.title}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-foreground line-clamp-2 flex-1">
                        {it.title}
                      </div>
                      <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                    </div>
                    {it.description && (
                      <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {it.description}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground/80 font-mono">
                      {it.source}
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("map.selectHint")}
                </div>
              )}
            </div>

            {(mode === "clusters" ? Boolean(selectedCluster) : Boolean(selectedEntity))
              && (mode === "clusters" ? selectedClusterMembers.length : selectedEntityNews.length) > 40 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                {t("map.moreMembers", { count: (mode === "clusters" ? selectedClusterMembers.length : selectedEntityNews.length) - 40 })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
