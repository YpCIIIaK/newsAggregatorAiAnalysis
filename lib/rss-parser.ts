import { type NewsItem, type RSSFeedConfig } from "./news-sources"

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim()
}

function extractCDATA(text: string): string {
  const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdataMatch) return stripHtml(cdataMatch[1])
  return stripHtml(text)
}

function extractImageFromContent(content: string): string | undefined {
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/)
  if (imgMatch) return imgMatch[1]
  const mediaMatch = content.match(/<media:content[^>]+url=["']([^"']+)["']/)
  if (mediaMatch) return mediaMatch[1]
  return undefined
}

function generateId(title: string, source: string): string {
  const str = `${source}-${title}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function parseWithRegex(xml: string, config: RSSFeedConfig): NewsItem[] {
  const items: NewsItem[] = []

  const rssItems = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []

  for (const item of rssItems.slice(0, 10)) {
    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)
    const contentMatch = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
    const enclosureMatch = item.match(/<enclosure[^>]+url=["']([^"']+)["']/)
    const mediaMatch = item.match(/<media:content[^>]+url=["']([^"']+)["']/)
    const mediaThumbnail = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/)

    const title = titleMatch ? extractCDATA(titleMatch[1]) : ""
    const link = linkMatch ? extractCDATA(linkMatch[1]) : ""
    const rawDesc = descMatch ? extractCDATA(descMatch[1]) : ""
    const rawContent = contentMatch ? extractCDATA(contentMatch[1]) : ""
    const desc = (rawDesc.length > 20 ? rawDesc : rawContent || rawDesc).substring(0, 400)
    const pubDate = pubDateMatch ? extractCDATA(pubDateMatch[1]) : new Date().toISOString()

    let imageUrl = enclosureMatch?.[1] || mediaMatch?.[1] || mediaThumbnail?.[1]
    if (!imageUrl && descMatch) {
      imageUrl = extractImageFromContent(descMatch[1])
    }

    if (title && link) {
      items.push({
        id: generateId(title, config.source),
        title,
        description: desc,
        url: link,
        source: config.source,
        category: config.category,
        publishedAt: pubDate,
        imageUrl,
      })
    }
  }

  if (items.length === 0) {
    const atomEntries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
    for (const entry of atomEntries.slice(0, 10)) {
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
      const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
      const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i)
      const updatedMatch = entry.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)
        || entry.match(/<published[^>]*>([\s\S]*?)<\/published>/i)

      const title = titleMatch ? extractCDATA(titleMatch[1]) : ""
      const link = linkMatch ? linkMatch[1] : ""
      const rawSummary = summaryMatch ? extractCDATA(summaryMatch[1]) : ""
      const rawContent = contentMatch ? extractCDATA(contentMatch[1]) : ""
      const desc = (rawSummary.length > 20 ? rawSummary : rawContent || rawSummary).substring(0, 400)
      const pubDate = updatedMatch ? extractCDATA(updatedMatch[1]) : new Date().toISOString()

      if (title && link) {
        items.push({
          id: generateId(title, config.source),
          title,
          description: desc,
          url: link,
          source: config.source,
          category: config.category,
          publishedAt: pubDate,
        })
      }
    }
  }

  return items
}

export async function fetchRSSFeed(config: RSSFeedConfig): Promise<NewsItem[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(config.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NewsFlow/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 300 },
    })

    clearTimeout(timeout)

    if (!res.ok) return []

    const xml = await res.text()
    return parseWithRegex(xml, config)
  } catch {
    return []
  }
}

export async function fetchHackerNewsTop(): Promise<NewsItem[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []

    const ids: number[] = await res.json()
    const topIds = ids.slice(0, 15)

    const stories = await Promise.allSettled(
      topIds.map(async (id) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          next: { revalidate: 300 },
        })
        if (!storyRes.ok) return null
        return storyRes.json()
      })
    )

    return stories
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value)
      .map((r) => ({
        id: `hn-${r.value.id}`,
        title: r.value.title || "",
        description: r.value.text ? extractCDATA(r.value.text).substring(0, 300) : `${r.value.score} points | ${r.value.descendants || 0} comments`,
        url: r.value.url || `https://news.ycombinator.com/item?id=${r.value.id}`,
        source: "Hacker News",
        category: "technology" as const,
        publishedAt: new Date(r.value.time * 1000).toISOString(),
      }))
  } catch {
    return []
  }
}
