/**
 * Admin UI historically used `dk` for Danish. ISO 639-1 and libraries such as FormatJS expect `da`.
 */
export const normalizeAdminLocale = (locale: string): string => (locale === 'dk' ? 'da' : locale);
