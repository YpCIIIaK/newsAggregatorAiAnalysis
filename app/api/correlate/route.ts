import { NextResponse } from "next/server"

type NewsCategory = "politics" | "world" | "business" | "stocks" | "technology" | "science" | "crypto"

type NewsSnippet = {
  title: string
  description?: string
  source?: string
  url?: string
  publishedAt?: string
}

const CORRELATE_VERSION = "2026-03-04-01"

const MAX_ITEMS_PER_CATEGORY_SINGLE = 6
const MAX_ITEMS_PER_CATEGORY_MULTI = 4
const MAX_TITLE_LEN = 180
const MAX_DESC_LEN_SINGLE = 140
const MAX_DESC_LEN_MULTI = 80
const OPENROUTER_TIMEOUT_MS = 8_000

function truncate(s: string, max: number): string {
  const str = (s || "").toString().trim()
  if (str.length <= max) return str
  return `${str.slice(0, max).trim()}…`
}

function coerceSnippets(items: unknown, maxItems: number, maxDesc: number): NewsSnippet[] {
  if (!Array.isArray(items)) return []
  return (items as unknown[])
    .map((it) => {
      if (typeof it === "string") return { title: truncate(it, MAX_TITLE_LEN) }
      if (!it || typeof it !== "object") return null
      const o = it as any
      const title = truncate(String(o.title || ""), MAX_TITLE_LEN)
      const description = o.description ? truncate(String(o.description), maxDesc) : undefined
      const source = o.source ? truncate(String(o.source), 80) : undefined
      const url = o.url ? String(o.url) : undefined
      const publishedAt = o.publishedAt ? String(o.publishedAt) : undefined
      if (!title) return null
      return { title, description, source, url, publishedAt } satisfies NewsSnippet
    })
    .filter((x): x is NewsSnippet => Boolean(x))
    .slice(0, maxItems)
}

function formatItemsForPrompt(items: Array<string | NewsSnippet>): string {
  return items
    .map((item, i) => {
      if (typeof item === "string") return `${i}. ${item}`
      const title = truncate((item.title || "").toString(), MAX_TITLE_LEN)
      const source = item.source ? ` (${item.source})` : ""
      const desc = item.description ? ` — ${truncate(item.description, MAX_DESC_LEN_SINGLE)}` : ""
      return `${i}. ${title}${source}${desc}`
    })
    .join("\n")
}

export async function GET() {
  return NextResponse.json({ ok: true, version: CORRELATE_VERSION })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { headlines, mode, focusItem, allHeadlines, itemsByCategory, includeSameCategory, analysisCategories } = body

    const referer = request.headers.get("origin")
      || (request.headers.get("host") ? `https://${request.headers.get("host")}` : "https://newsflow.vercel.app")

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const model = process.env.OPENROUTER_CORRELATE_MODEL
      || process.env.OPENROUTER_MODEL
      || "qwen/qwen3-vl-235b-a22b-thinking"

    const allCats: NewsCategory[] = ["politics", "world", "business", "stocks", "technology", "science", "crypto"]
    const allowedCats = Array.isArray(analysisCategories)
      ? new Set<string>(analysisCategories.filter((c: unknown) => typeof c === "string"))
      : null
    const categoriesToUse: NewsCategory[] = allowedCats
      ? allCats.filter((c) => allowedCats.has(c))
      : allCats

    let prompt: string

    if (mode === "single" && focusItem && allHeadlines) {
      // Single-item mode: find related news from OTHER categories
      const otherCategories = Object.entries(allHeadlines as Record<string, unknown>)
        .filter(([cat]) => categoriesToUse.includes(cat as NewsCategory))
        .filter(([cat]) => (includeSameCategory ? true : cat !== focusItem.category))
        .map(([cat, items]) => {
          const catLabel =
            cat === "politics" ? "ПОЛИТИКА"
            : cat === "world" ? "МИР"
            : cat === "business" ? "БИЗНЕС"
            : cat === "stocks" ? "ФИНАНСЫ"
            : cat === "technology" ? "ТЕХНОЛОГИИ"
            : cat === "science" ? "НАУКА"
            : "КРИПТО"
          const list = formatItemsForPrompt(coerceSnippets(items, MAX_ITEMS_PER_CATEGORY_SINGLE, MAX_DESC_LEN_SINGLE))
          return `${catLabel}:\n${list || "Нет данных"}`
        })
        .join("\n\n")

      const focusCatLabel =
        focusItem.category === "politics" ? "Политика"
        : focusItem.category === "world" ? "Мир"
        : focusItem.category === "business" ? "Бизнес"
        : focusItem.category === "stocks" ? "Финансы"
        : focusItem.category === "technology" ? "Технологии"
        : focusItem.category === "science" ? "Наука"
        : "Крипто"

      prompt = `Ты эксперт-аналитик. Пользователь выбрал одну новость и хочет найти связанные новости ${includeSameCategory ? "(включая эту же категорию)" : "из ДРУГИХ категорий"}.

ВЫБРАННАЯ НОВОСТЬ (категория: ${focusCatLabel}):
Заголовок: ${focusItem.title}
${focusItem.description ? `Описание: ${focusItem.description}` : ""}

НОВОСТИ ДЛЯ ПОИСКА СВЯЗЕЙ:
${otherCategories}

Найди новости из списка выше, которые СВЯЗАНЫ с выбранной новостью. Связь может быть прямой (те же события, люди, компании) или косвенной (влияние на рынок, технологические последствия, политические аспекты).

Ответь ТОЛЬКО валидным JSON (без markdown):
{
  "relatedIndices": {
    "politics": [0, 2],
    "stocks": [1, 3],
    "technology": [0]
  },
  "connections": [
    {
      "title": "Краткое название связи",
      "description": "Подробное описание связи между выбранной новостью и найденными (2-3 предложения)",
      "relatedCategory": "stocks",
      "relatedIndex": 1,
      "strength": "strong|moderate|weak",
      "impact": "high|medium|low"
    }
  ],
  "summary": "Общий вывод о связях выбранной новости с другими категориями (2-3 предложения)"
}

ВАЖНО:
- relatedIndices - номера новостей (с 0) из каждой категории, которые связаны с выбранной
${includeSameCategory ? "- Можно включать категорию выбранной новости в relatedIndices, но НЕ включай саму выбранную новость\n" : `- НЕ включай категорию выбранной новости (${focusItem.category}) в relatedIndices\n`}- Находи только реальные, обоснованные связи
- Если связей нет - верни пустые массивы`
    } else {
      const labelForCat = (cat: NewsCategory): string =>
        cat === "politics" ? "POLITICS"
        : cat === "world" ? "WORLD"
        : cat === "business" ? "BUSINESS"
        : cat === "stocks" ? "STOCKS/FINANCE"
        : cat === "technology" ? "TECHNOLOGY"
        : cat === "science" ? "SCIENCE"
        : "CRYPTO"

      const blocks: string[] = []
      for (const cat of categoriesToUse) {
        let list = "Нет данных"

        if (itemsByCategory && typeof itemsByCategory === "object") {
          const byCat = itemsByCategory as Record<string, unknown>
          list = formatItemsForPrompt(coerceSnippets(byCat[cat], MAX_ITEMS_PER_CATEGORY_MULTI, MAX_DESC_LEN_MULTI)) || "Нет данных"
        } else {
          const items = headlines?.[cat]
          if (Array.isArray(items)) {
            list = formatItemsForPrompt(coerceSnippets(items, MAX_ITEMS_PER_CATEGORY_MULTI, MAX_DESC_LEN_MULTI)) || "Нет данных"
          }
        }

        blocks.push(`${labelForCat(cat)}:\n${list}`)
      }

      // Multi-item / all headlines mode
      prompt = `You are an expert analyst. Analyze these current news items across categories and find correlations, patterns, and connections between them. Respond in Russian.

${blocks.join("\n\n")}

Provide your analysis in this exact JSON format (respond ONLY with valid JSON, no markdown):
{
  "correlations": [
    {
      "title": "Short correlation title in Russian",
      "description": "Detailed explanation of the correlation in Russian (2-3 sentences)",
      "categories": ["politics", "stocks"],
      "impact": "high|medium|low",
      "sentiment": "positive|negative|neutral"
    }
  ],
  "summary": "Brief overall summary of the news landscape in Russian (2-3 sentences)",
  "marketImpact": "Brief assessment of potential market impact in Russian"
}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": referer,
          "X-Title": "NewsFlow AI Aggregator",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a professional news analyst. Always respond in Russian. Output only valid JSON without markdown code blocks.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      })
    } catch (e) {
      clearTimeout(timeout)
      const isAbort = e instanceof Error && (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"))
      if (isAbort) {
        return NextResponse.json(
          { error: "AI request timeout", model, version: CORRELATE_VERSION },
          { status: 504 }
        )
      }
      throw e
    }

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      console.error("OpenRouter error:", errText)
      return NextResponse.json(
        { error: "AI service error", details: errText, upstreamStatus: response.status, model, version: CORRELATE_VERSION },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    let analysis
    try {
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim()
      analysis = JSON.parse(cleaned)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0])
        } catch {
          analysis = {
            correlations: [],
            summary: content.substring(0, 500),
            marketImpact: "Не удалось проанализировать",
          }
        }
      } else {
        analysis = {
          correlations: [],
          summary: content.substring(0, 500),
          marketImpact: "Не удалось проанализировать",
        }
      }
    }

    return NextResponse.json({
      analysis,
      mode: mode || "multi",
      model: data.model || model,
      usage: data.usage,
      version: CORRELATE_VERSION,
    })
  } catch (error) {
    console.error("Correlation API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
