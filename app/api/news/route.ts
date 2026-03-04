import { NextResponse } from "next/server"
import { RSS_FEEDS, type NewsCategory, type NewsItem } from "@/lib/news-sources"
import { fetchRSSFeed, fetchHackerNewsTop } from "@/lib/rss-parser"

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .trim()
}

export const revalidate = 300 // 5 min cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") as NewsCategory | null

  const feedsToFetch = category
    ? RSS_FEEDS.filter((f) => f.category === category)
    : RSS_FEEDS

  const feedPromises = feedsToFetch.map((feed) => fetchRSSFeed(feed))

  // Add Hacker News for technology
  if (!category || category === "technology") {
    feedPromises.push(fetchHackerNewsTop())
  }

  const results = await Promise.allSettled(feedPromises)

  const allItems: NewsItem[] = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)

  // Deduplicate by stable key
  const seen = new Set<string>()
  const deduped = allItems.filter((item) => {
    const urlKey = (item.url || "").trim().toLowerCase()
    const titleKey = normalizeTitle(item.title || "")
    const sourceKey = (item.source || "").trim().toLowerCase()
    const key = `${sourceKey}::${urlKey}::${titleKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by date
  deduped.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    if (isNaN(dateA) && isNaN(dateB)) return 0
    if (isNaN(dateA)) return 1
    if (isNaN(dateB)) return -1
    return dateB - dateA
  })

  // Group by category
  const grouped: Record<NewsCategory, NewsItem[]> = {
    politics: [],
    world: [],
    business: [],
    stocks: [],
    technology: [],
    science: [],
    crypto: [],
  }

  for (const item of deduped) {
    grouped[item.category]?.push(item)
  }

  // Cap per category
  for (const cat of Object.keys(grouped) as NewsCategory[]) {
    grouped[cat] = grouped[cat].slice(0, 30)
  }

  const sourceCounts: Record<string, number> = {}
  for (const item of deduped) {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1
  }

  return NextResponse.json({
    news: grouped,
    totalItems: deduped.length,
    sources: Object.keys(sourceCounts).length,
    sourceCounts,
    fetchedAt: new Date().toISOString(),
  })
}
