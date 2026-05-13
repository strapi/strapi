/**
 * Loads a locale JSON file from a plugin or package `translations/` folder.
 * When `locale` is `da`, falls back to the legacy `dk` filename so third-party
 * plugins that still ship only `dk.json` keep working after core switched Danish
 * to ISO 639-1 (`da`).
 *
 * Always pass `importJson` as a single dynamic import template, for example:
 * `(code) => import(\`./translations/${code}.json\`)` so bundlers include every
 * JSON file present in that directory in the chunk map.
 */
export async function importLocaleJsonWithLegacyDkFallback(
  locale: string,
  importJson: (code: string) => Promise<{ default: Record<string, string> }>
): Promise<Record<string, string>> {
  const load = async (code: string) => {
    const mod = await importJson(code);
    return mod.default ?? {};
  };

  try {
    return await load(locale);
  } catch {
    if (locale === 'da') {
      try {
        return await load('dk');
      } catch {
        return {};
      }
    }

    return {};
  }
}
