export type Lang = "ru" | "en"

type Dict = Record<string, string>

type Category = "politics" | "world" | "business" | "stocks" | "technology" | "science" | "crypto"

export const dictionaries: Record<Lang, Dict> = {
  ru: {
    "app.title": "NewsFlow",
    "app.tagline": "AI News Aggregator",

    "header.loading": "Загрузка...",
    "header.sources": "источников",
    "header.news": "новостей",

    "controls.selected": "Выбрано",
    "controls.reset": "Сбросить",
    "controls.refresh": "Обновить",

    "feed.mode.categories": "Категории",
    "feed.mode.mixed": "Все новости",
    "feed.max3": "Можно выбрать максимум 3 категории",
    "feed.selectedCount": "Выбрано: {count}",

    "filters.searchPlaceholder": "Поиск по заголовку/описанию...",
    "filters.timeRange": "Диапазон",
    "filters.time.24h": "24ч",
    "filters.time.48h": "48ч",
    "filters.time.7d": "7д",
    "filters.time.all": "Всё время",
    "filters.sources": "Источники",
    "filters.sourcesEmpty": "Нет источников",
    "filters.clearSources": "Очистить",
    "filters.reset": "Сброс",

    "feed.queueTitle": "Все новости",
    "feed.noData": "Нет данных",
    "feed.noDataSub": "Источники временно недоступны",
    "feed.relatedCount": "{count} связь",

    "stats.top": "Топ:",

    "footer.left": "NewsFlow v1.0 | AI-powered news aggregator",
    "footer.right": "{model} via OpenRouter | RSS + Hacker News API",

    "category.politics": "Политика",
    "category.world": "Мир",
    "category.business": "Бизнес",
    "category.stocks": "Финансы",
    "category.technology": "Технологии",
    "category.science": "Наука",
    "category.crypto": "Крипто",

    "card.aiFound": "AI нашёл связь",
    "card.removeFromAnalysis": "Убрать из анализа",
    "card.addToAnalysis": "Выбрать для анализа",
    "card.openSource": "Перейти на сайт",
    "card.source": "Источник",

    "time.justNow": "Только что",
    "time.minAgo": "{count} мин назад",
    "time.hourAgo": "{count} ч назад",
    "time.dayAgo": "{count} д назад",

    "ai.title": "AI Корреляция",
    "ai.clearHighlights": "Снять подсветку",
    "ai.clearHighlightsTitle": "Снять подсветку связанных новостей",
    "ai.mode.single": "Одна новость",
    "ai.mode.multi": "Множественный",
    "ai.model": "Model: {model}",
    "ai.singleHint": "Выберите одну новость кнопкой-кружком, и AI найдёт связанные новости из других категорий.",
    "ai.multiHint": "Выберите несколько новостей (2+) или нажмите анализ для всех заголовков.",
    "ai.includeSameCategory": "Искать связи и в той же категории",
    "ai.categoriesForSearch": "Категории для поиска:",
    "ai.selectAll": "все",

    "ai.selected.single": "Выбранная новость:",
    "ai.selected.singleNeed1": "Выбрано {count} (нужна 1)",
    "ai.selected.multi": "Выбрано для анализа: {count}",
    "ai.selected.tooMany": "В режиме \"Одна новость\" можно выбрать только одну. Сбросьте лишние.",
    "ai.clearSelectionTitle": "Очистить выбор",

    "ai.button.findRelated": "Найти связанное",
    "ai.button.analyze": "Анализировать",
    "ai.loading.single": "Ищу связи...",
    "ai.loading.multi": "Анализирую...",

    "ai.empty.single": "Выберите одну новость и нажмите \"Найти связанное\" -- AI подсветит связанные новости из других категорий",
    "ai.empty.multi": "Выберите новости или нажмите \"Анализировать\" для поиска корреляций между всеми",

    "ai.result.summary": "Итог",
    "ai.result.connections": "Найденные связи ({count})",
    "ai.result.none": "Явных связей не найдено",

    "ai.multi.summary": "Общая картина",
    "ai.multi.marketImpact": "Влияние на рынок",
    "ai.multi.correlations": "Корреляции ({count})",

    "common.more": "+{count} ещё",
    "common.close": "Закрыть",
    "common.errorRequest": "Ошибка запроса",
    "common.errorAnalysis": "Ошибка анализа",

    "impact.high": "Высокое",
    "impact.medium": "Среднее",
    "impact.low": "Низкое",
    "strength.strong": "Сильная",
    "strength.moderate": "Средняя",
    "strength.weak": "Слабая",

    "favorites.title": "Избранное",
    "favorites.empty": "Пока пусто",
    "favorites.add": "В избранное",
    "favorites.remove": "Убрать из избранного",
    "favorites.clear": "Очистить",

    "map.title": "Карта связей",
    "map.short": "Map",
    "map.fit": "Fit",
    "map.search": "Поиск кластеров",
    "map.minWeight": "Мин. связь",
    "map.loading": "Строю граф...",
    "map.error": "Ошибка",
    "map.empty": "Нет данных",
    "map.details": "Детали",
    "map.selectHint": "Выберите кластер на графе",
    "map.clusterSize": "Новостей: {count}",
    "map.moreMembers": "+{count} ещё",
    "map.mode.clusters": "Кластеры",
    "map.mode.entities": "Сущности",
    "map.entityMentions": "Упоминаний: {count}",
  },
  en: {
    "app.title": "NewsFlow",
    "app.tagline": "AI News Aggregator",

    "header.loading": "Loading...",
    "header.sources": "sources",
    "header.news": "news",

    "controls.selected": "Selected",
    "controls.reset": "Reset",
    "controls.refresh": "Refresh",

    "feed.mode.categories": "Categories",
    "feed.mode.mixed": "All news",
    "feed.max3": "You can select up to 3 categories",
    "feed.selectedCount": "Selected: {count}",

    "filters.searchPlaceholder": "Search title/description...",
    "filters.timeRange": "Range",
    "filters.time.24h": "24h",
    "filters.time.48h": "48h",
    "filters.time.7d": "7d",
    "filters.time.all": "All time",
    "filters.sources": "Sources",
    "filters.sourcesEmpty": "No sources",
    "filters.clearSources": "Clear",
    "filters.reset": "Reset",

    "feed.queueTitle": "All news",
    "feed.noData": "No data",
    "feed.noDataSub": "Sources are temporarily unavailable",
    "feed.relatedCount": "{count} related",

    "stats.top": "Top:",

    "footer.left": "NewsFlow v1.0 | AI-powered news aggregator",
    "footer.right": "{model} via OpenRouter | RSS + Hacker News API",

    "category.politics": "Politics",
    "category.world": "World",
    "category.business": "Business",
    "category.stocks": "Stocks",
    "category.technology": "Technology",
    "category.science": "Science",
    "category.crypto": "Crypto",

    "card.aiFound": "AI found a connection",
    "card.removeFromAnalysis": "Remove from analysis",
    "card.addToAnalysis": "Add to analysis",
    "card.openSource": "Open source",
    "card.source": "Source",

    "time.justNow": "Just now",
    "time.minAgo": "{count}m ago",
    "time.hourAgo": "{count}h ago",
    "time.dayAgo": "{count}d ago",

    "ai.title": "AI Correlation",
    "ai.clearHighlights": "Clear highlights",
    "ai.clearHighlightsTitle": "Clear highlighted related news",
    "ai.mode.single": "Single",
    "ai.mode.multi": "Multi",
    "ai.model": "Model: {model}",
    "ai.singleHint": "Select one item and AI will find related news in other categories.",
    "ai.multiHint": "Select multiple items (2+) or analyze all headlines.",
    "ai.includeSameCategory": "Include same category",
    "ai.categoriesForSearch": "Categories to search:",
    "ai.selectAll": "all",

    "ai.selected.single": "Selected item:",
    "ai.selected.singleNeed1": "Selected {count} (need 1)",
    "ai.selected.multi": "Selected for analysis: {count}",
    "ai.selected.tooMany": "In single mode you can select only one. Remove extra selections.",
    "ai.clearSelectionTitle": "Clear selection",

    "ai.button.findRelated": "Find related",
    "ai.button.analyze": "Analyze",
    "ai.loading.single": "Finding links...",
    "ai.loading.multi": "Analyzing...",

    "ai.empty.single": "Select one item and click \"Find related\" -- AI will highlight related news",
    "ai.empty.multi": "Select items or click \"Analyze\" to find correlations",

    "ai.result.summary": "Summary",
    "ai.result.connections": "Connections ({count})",
    "ai.result.none": "No obvious connections found",

    "ai.multi.summary": "Overview",
    "ai.multi.marketImpact": "Market impact",
    "ai.multi.correlations": "Correlations ({count})",

    "common.more": "+{count} more",
    "common.close": "Close",
    "common.errorRequest": "Request error",
    "common.errorAnalysis": "Analysis error",

    "impact.high": "High",
    "impact.medium": "Medium",
    "impact.low": "Low",
    "strength.strong": "Strong",
    "strength.moderate": "Moderate",
    "strength.weak": "Weak",

    "favorites.title": "Saved",
    "favorites.empty": "Nothing saved yet",
    "favorites.add": "Save",
    "favorites.remove": "Remove",
    "favorites.clear": "Clear",

    "map.title": "Connections Map",
    "map.short": "Map",
    "map.fit": "Fit",
    "map.search": "Search clusters",
    "map.minWeight": "Min link",
    "map.loading": "Building graph...",
    "map.error": "Error",
    "map.empty": "No data",
    "map.details": "Details",
    "map.selectHint": "Select a cluster in the graph",
    "map.clusterSize": "Items: {count}",
    "map.moreMembers": "+{count} more",
    "map.mode.clusters": "Clusters",
    "map.mode.entities": "Entities",
    "map.entityMentions": "Mentions: {count}",
  },
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key]
    return v === undefined ? `{${key}}` : String(v)
  })
}

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[lang]
  const template = dict[key] ?? dictionaries.en[key] ?? key
  return interpolate(template, params)
}

export function categoryKey(cat: Category): string {
  return `category.${cat}`
}
