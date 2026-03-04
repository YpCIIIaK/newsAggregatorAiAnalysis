"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { type Lang, t as translate } from "@/lib/i18n"

type I18nContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children, defaultLang = "ru" }: { children: React.ReactNode; defaultLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(defaultLang)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("newsflow_lang")
      if (stored === "ru" || stored === "en") setLangState(stored)
    } catch {
      // ignore
    }
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem("newsflow_lang", next)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang
    }
  }, [lang])

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
