import { NextResponse } from "next/server"

type NewsCategory = "politics" | "world" | "business" | "stocks" | "technology" | "science" | "crypto"

type NewsItem = {
  id: string
  title: string
  description?: string
  url: string
  source: string
  category: NewsCategory
  publishedAt: string
}

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

const STOPWORDS_EN = new Set<string>([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","he","her","his","i","in","is","it","its","of","on","or","our","she","that","the","their","them","they","this","to","was","we","were","will","with","you",
])

const STOPWORDS_RU = new Set<string>([
  "и","в","во","не","что","он","на","я","с","со","как","а","то","все","она","так","его","но","да","ты","к","у","же","вы","за","бы","по","ее","мне","есть","они","тут","где","при","мы","только","еще","или","ни","быть",
])

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  const norm = normalizeText(text)
  if (!norm) return []
  const parts = norm.split(" ")
  const tokens: string[] = []
  for (const p of parts) {
    if (p.length < 3) continue
    if (STOPWORDS_EN.has(p) || STOPWORDS_RU.has(p)) continue
    tokens.push(p)
  }
  return tokens
}

function topKeywordsForItem(item: NewsItem): string[] {
  const tokens = tokenize(`${item.title} ${item.description || ""}`)
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k]) => k)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function unionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = Array.from({ length: n }, () => 0)

  const find = (x: number): number => {
    let p = parent[x]
    while (p !== parent[p]) p = parent[p]
    let y = x
    while (y !== parent[y]) {
      const next = parent[y]
      parent[y] = p
      y = next
    }
    return p
  }

  const union = (a: number, b: number) => {
    let ra = find(a)
    let rb = find(b)
    if (ra === rb) return
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb
      return
    }
    if (rank[ra] > rank[rb]) {
      parent[rb] = ra
      return
    }
    parent[rb] = ra
    rank[ra]++
  }

  return { find, union }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const itemsByCategory = body?.itemsByCategory as Record<string, unknown> | undefined

    const all: NewsItem[] = []
    if (itemsByCategory && typeof itemsByCategory === "object") {
      for (const v of Object.values(itemsByCategory)) {
        if (!Array.isArray(v)) continue
        for (const item of v as unknown[]) {
          if (!item || typeof item !== "object") continue
          const it = item as Partial<NewsItem>
          if (!it.id || !it.title || !it.url || !it.source || !it.category || !it.publishedAt) continue
          all.push(it as NewsItem)
        }
      }
    }

    const maxItems = typeof body?.maxItems === "number" ? Math.max(1, Math.min(600, body.maxItems)) : 300
    const windowHours = typeof body?.windowHours === "number" ? Math.max(1, Math.min(168, body.windowHours)) : 48

    const now = Date.now()
    const cutoff = now - windowHours * 3600_000

    const items = all
      .filter((i) => {
        const ts = new Date(i.publishedAt).getTime()
        return isNaN(ts) ? true : ts >= cutoff
      })
      .sort((a, b) => {
        const da = new Date(a.publishedAt).getTime()
        const db = new Date(b.publishedAt).getTime()
        if (isNaN(da) && isNaN(db)) return 0
        if (isNaN(da)) return 1
        if (isNaN(db)) return -1
        return db - da
      })
      .slice(0, maxItems)

    const members: Record<string, NewsItem> = {}
    for (const i of items) members[i.id] = i

    const kwSets = items.map((i) => new Set(topKeywordsForItem(i)))

    const uf = unionFind(items.length)

    const maxCompare = 40
    const threshold = 0.34

    for (let i = 0; i < items.length; i++) {
      const aTs = new Date(items[i].publishedAt).getTime()
      for (let j = i + 1; j < Math.min(items.length, i + 1 + maxCompare); j++) {
        const bTs = new Date(items[j].publishedAt).getTime()
        if (!isNaN(aTs) && !isNaN(bTs)) {
          const diffH = Math.abs(aTs - bTs) / 3600_000
          if (diffH > windowHours) continue
        }

        const sim = jaccard(kwSets[i], kwSets[j])
        if (sim >= threshold) uf.union(i, j)
      }
    }

    const groups = new Map<number, number[]>()
    for (let i = 0; i < items.length; i++) {
      const root = uf.find(i)
      const arr = groups.get(root) || []
      arr.push(i)
      groups.set(root, arr)
    }

    const nodes: ClusterNode[] = []

    const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length)

    for (let gi = 0; gi < sortedGroups.length; gi++) {
      const idxs = sortedGroups[gi]
      const freq = new Map<string, number>()
      const cats: Partial<Record<NewsCategory, number>> = {}
      const memberIds: string[] = []

      for (const idx of idxs) {
        const it = items[idx]
        memberIds.push(it.id)
        cats[it.category] = (cats[it.category] || 0) + 1
        for (const kw of kwSets[idx]) {
          freq.set(kw, (freq.get(kw) || 0) + 1)
        }
      }

      const top = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k)

      const label = top.length > 0
        ? top.map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(" · ")
        : items[idxs[0]]?.title?.substring(0, 50) || `Cluster ${gi + 1}`

      nodes.push({
        id: `c-${gi}`,
        label,
        size: idxs.length,
        topKeywords: top,
        categories: cats,
        memberIds,
      })
    }

    const links: ClusterEdge[] = []
    const nodeKw = nodes.map((n) => new Set(n.topKeywords))

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodeKw[i]
        const b = nodeKw[j]
        const sim = jaccard(a, b)
        if (sim < 0.2) continue
        const common: string[] = []
        for (const x of a) if (b.has(x)) common.push(x)
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          weight: Number(sim.toFixed(3)),
          keywords: common.slice(0, 3),
        })
      }
    }

    const res: GraphResponse = { nodes, links, members }
    return NextResponse.json(res)
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
