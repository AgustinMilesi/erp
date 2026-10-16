import { cookies } from "next/headers";
import { type Locale, getDictionary, type TranslationDict } from "./i18n";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get("erp-locale")?.value as Locale;
    if (val && (["es", "en", "pt", "zh"] as const).includes(val)) {
      return val;
    }
  } catch {
    // outside request context
  }
  return "es";
}

export async function getServerTranslations(): Promise<{ locale: Locale; t: TranslationDict }> {
  const locale = await getServerLocale();
  return { locale, t: getDictionary(locale) };
}
