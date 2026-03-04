export type NewsCategory = "politics" | "world" | "business" | "stocks" | "technology" | "science" | "crypto"

export interface NewsItem {
  id: string
  title: string
  description?: string
  url: string
  source: string
  sourceIcon?: string
  category: NewsCategory
  publishedAt: string
  imageUrl?: string
}

export interface RSSFeedConfig {
  url: string
  source: string
  category: NewsCategory
  language?: string
}

export const RSS_FEEDS: RSSFeedConfig[] = [
  // --- TECHNOLOGY ---
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", source: "Ars Technica", category: "technology" },
  { url: "https://www.theverge.com/rss/index.xml", source: "The Verge", category: "technology" },
  { url: "https://techcrunch.com/feed/", source: "TechCrunch", category: "technology" },
  { url: "https://www.wired.com/feed/rss", source: "WIRED", category: "technology" },
  { url: "https://feeds.feedburner.com/TechRadar", source: "TechRadar", category: "technology" },
  { url: "https://www.engadget.com/rss.xml", source: "Engadget", category: "technology" },
  { url: "https://9to5mac.com/feed/", source: "9to5Mac", category: "technology" },
  { url: "https://www.zdnet.com/news/rss.xml", source: "ZDNet", category: "technology" },
  { url: "https://www.theregister.com/headlines.atom", source: "The Register", category: "technology" },
  { url: "https://feeds.feedburner.com/oreilly/radar/atom", source: "O'Reilly Radar", category: "technology" },

  // --- POLITICS ---
  { url: "https://feeds.bbci.co.uk/news/politics/rss.xml", source: "BBC Politics", category: "politics" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", source: "NY Times Politics", category: "politics" },
  { url: "https://feeds.washingtonpost.com/rss/politics", source: "Washington Post", category: "politics" },
  { url: "https://www.politico.com/rss/politics08.xml", source: "Politico", category: "politics" },
  { url: "https://feeds.reuters.com/Reuters/PoliticsNews", source: "Reuters Politics", category: "politics" },

  // --- WORLD ---
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NY Times World", category: "world" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "world" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "world" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian World", category: "world" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", source: "Reuters World", category: "world" },

  // --- BUSINESS ---
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business", category: "business" },
  { url: "https://www.ft.com/rss/home", source: "Financial Times", category: "business" },
  { url: "https://www.economist.com/the-world-this-week/rss.xml", source: "The Economist", category: "business" },

  // --- STOCKS / FINANCE ---
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", source: "Yahoo Finance", category: "stocks" },
  { url: "https://www.investing.com/rss/news.rss", source: "Investing.com", category: "stocks" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", source: "MarketWatch", category: "stocks" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC", category: "stocks" },
  { url: "https://feeds.bloomberg.com/markets/news.rss", source: "Bloomberg", category: "stocks" },
  { url: "https://seekingalpha.com/market_currents.xml", source: "Seeking Alpha", category: "stocks" },
  { url: "https://www.ft.com/rss/markets", source: "Financial Times Markets", category: "stocks" },

  // --- SCIENCE ---
  { url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", source: "NASA", category: "science" },
  { url: "https://www.sciencedaily.com/rss/all.xml", source: "ScienceDaily", category: "science" },
  { url: "https://www.nature.com/subjects/science/rss", source: "Nature", category: "science" },

  // --- CRYPTO ---
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", category: "crypto" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph", category: "crypto" },
]

export const HACKER_NEWS_API = "https://hacker-news.firebaseio.com/v0"
