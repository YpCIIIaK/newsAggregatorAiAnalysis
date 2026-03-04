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

type EntityType = "company" | "person" | "country"

type ExtractedEntity = {
  name: string
  type: EntityType
  mentions?: number
  newsIndices?: number[]
}

type ExtractedRelation = {
  source: string
  target: string
  type: string
  // optional; if model doesn't provide, we compute it
  strength?: "strong" | "moderate" | "weak"
  evidence?: number[]
}

type ExtractBatchResult = {
  entities: ExtractedEntity[]
  relations: ExtractedRelation[]
}

type GraphNode = {
  id: string
  label: string
  type: EntityType
  count: number
  evidence: number[]
}

type GraphLink = {
  source: string
  target: string
  type: string
  weight: number
  evidence: number[]
}

type EntityGraphResponse = {
  nodes: GraphNode[]
  links: GraphLink[]
  news: NewsItem[]
}

const CACHE_TTL_MS = 10 * 60 * 1000
let cache: { key: string; at: number; value: EntityGraphResponse } | null = null

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(inc|incorporated|corp|corporation|ltd|limited|co|company|plc)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function stableKey(items: NewsItem[], batchSize: number): string {
  const base = items
    .map((i) => `${i.id}|${i.url}|${i.publishedAt}`)
    .join("\n")
  return `${batchSize}::${base}`
}

async function withConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const my = idx
      idx++
      results[my] = await tasks[my]()
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, () => worker())
  await Promise.all(workers)
  return results
}

function safeJson(content: string): any {
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Invalid JSON from model")
    return JSON.parse(jsonMatch[0])
  }
}

function labelType(t: string): EntityType | null {
  if (t === "company" || t === "person" || t === "country") return t
  return null
}

async function extractBatch(params: {
  apiKey: string
  model: string
  items: NewsItem[]
  offset: number
}): Promise<ExtractBatchResult> {
  const { apiKey, model, items, offset } = params

  const list = items
    .map((it, i) => {
      const desc = it.description ? ` — ${it.description}` : ""
      return `${offset + i}. ${it.title}${desc} (${it.source})`
    })
    .join("\n")

  const prompt = `Extract named entities and relations from these news items.

Return ONLY valid JSON (no markdown) in this format:
{
  "entities": [
    {
      "name": "Entity name",
      "type": "company|person|country",
      "mentions": 1,
      "newsIndices": [0, 2]
    }
  ],
  "relations": [
    {
      "source": "Entity name",
      "target": "Entity name",
      "type": "relationship type in English (e.g. sanction, acquisition, partnership, lawsuit, regulation, launch, earnings)",
      "strength": "strong|moderate|weak",
      "evidence": [0, 2]
    }
  ]
}

Rules:
- Use ONLY entity types company/person/country.
- Use indices exactly as provided in the list.
- Entities must be real and grounded in the items.
- Prefer canonical names (e.g., "United States" not "US"; "European Union" not "EU")

ITEMS:
${list}`

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://newsflow.vercel.app",
      "X-Title": "NewsFlow AI Aggregator",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert information extraction system. Output only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(errText || `Upstream error ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""
  const parsed = safeJson(content)

  const entities: ExtractedEntity[] = Array.isArray(parsed?.entities) ? parsed.entities : []
  const relations: ExtractedRelation[] = Array.isArray(parsed?.relations) ? parsed.relations : []

  return { entities, relations }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 })
    }

    const model = process.env.OPENROUTER_MODEL || "qwen/qwen3-vl-235b-a22b-thinking"

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

    const maxItems = typeof body?.maxItems === "number" ? Math.max(20, Math.min(400, body.maxItems)) : 250
    const batchSize = typeof body?.batchSize === "number" ? Math.max(10, Math.min(50, body.batchSize)) : 25
    const concurrency = typeof body?.concurrency === "number" ? Math.max(1, Math.min(5, body.concurrency)) : 3

    const items = all
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, maxItems)

    const key = stableKey(items, batchSize)
    if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.value)
    }

    const batches = chunkArray(items, batchSize)

    const tasks = batches.map((batch, bi) => () => extractBatch({
      apiKey,
      model,
      items: batch,
      offset: bi * batchSize,
    }))

    const settled = await withConcurrency(tasks, concurrency)

    const entityMap = new Map<string, GraphNode>()
    const linkMap = new Map<string, GraphLink>()

    function upsertEntity(name: string, type: EntityType, evidence: number[]) {
      const norm = normalizeName(name)
      if (!norm) return
      const id = `${type}:${norm}`
      const prev = entityMap.get(id)
      if (!prev) {
        entityMap.set(id, {
          id,
          label: name,
          type,
          count: 1,
          evidence: [...new Set(evidence)].slice(0, 200),
        })
        return
      }

      prev.count += 1
      const merged = new Set<number>([...prev.evidence, ...evidence])
      prev.evidence = [...merged].slice(0, 200)

      // prefer longer/more descriptive label
      if ((name || "").length > (prev.label || "").length) prev.label = name
    }

    function upsertLink(sourceId: string, targetId: string, type: string, evidence: number[]) {
      if (sourceId === targetId) return
      const a = sourceId < targetId ? sourceId : targetId
      const b = sourceId < targetId ? targetId : sourceId
      const key = `${a}__${b}__${type}`

      const prev = linkMap.get(key)
      if (!prev) {
        linkMap.set(key, {
          source: a,
          target: b,
          type,
          weight: 1,
          evidence: [...new Set(evidence)].slice(0, 200),
        })
        return
      }

      prev.weight += 1
      const merged = new Set<number>([...prev.evidence, ...evidence])
      prev.evidence = [...merged].slice(0, 200)
    }

    // Aggregate batches
    for (const batch of settled) {
      for (const e of batch.entities || []) {
        if (!e || typeof e !== "object") continue
        const t = labelType((e as any).type)
        if (!t) continue
        const name = String((e as any).name || "").trim()
        if (!name) continue
        const ev = Array.isArray((e as any).newsIndices) ? (e as any).newsIndices.filter((x: any) => Number.isFinite(x)) : []
        upsertEntity(name, t, ev)
      }

      for (const r of batch.relations || []) {
        if (!r || typeof r !== "object") continue
        const sName = String((r as any).source || "").trim()
        const tName = String((r as any).target || "").trim()
        if (!sName || !tName) continue
        const type = String((r as any).type || "related").trim() || "related"
        const ev = Array.isArray((r as any).evidence) ? (r as any).evidence.filter((x: any) => Number.isFinite(x)) : []

        // resolve to existing entities: try matching by any type
        const sNorm = normalizeName(sName)
        const tNorm = normalizeName(tName)
        if (!sNorm || !tNorm) continue

        const sCandidates = [
          `company:${sNorm}`,
          `person:${sNorm}`,
          `country:${sNorm}`,
        ].filter((id) => entityMap.has(id))

        const tCandidates = [
          `company:${tNorm}`,
          `person:${tNorm}`,
          `country:${tNorm}`,
        ].filter((id) => entityMap.has(id))

        if (sCandidates.length === 0 || tCandidates.length === 0) continue

        // pick first match (most common type ordering)
        upsertLink(sCandidates[0], tCandidates[0], type, ev)
      }
    }

    // Remove too-rare entities for readability
    const nodes = [...entityMap.values()]
      .filter((n) => n.count >= 2 || n.evidence.length >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 250)

    const nodeSet = new Set(nodes.map((n) => n.id))

    const links = [...linkMap.values()]
      .filter((l) => nodeSet.has(l.source) && nodeSet.has(l.target) && l.weight >= 2)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 600)

    const response: EntityGraphResponse = { nodes, links, news: items }
    cache = { key, at: Date.now(), value: response }

    return NextResponse.json(response)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
