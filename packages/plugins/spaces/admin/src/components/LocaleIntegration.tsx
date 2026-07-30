import { useField } from '@strapi/admin/strapi-admin';
import { Flex } from '@strapi/design-system';

import { DefaultInColumn } from './DefaultInColumn';
import { SpaceChipColumn } from './SpaceChipColumn';
import { SpaceDefaultPicker } from './SpaceDefaultPicker';
import { SpaceVisibilityField } from './SpaceVisibilityField';

/**
 * Glue between the spaces components and the extension points i18n's admin
 * exposes (`registerLocaleFormExtension` / `registerLocaleTableColumn` — see
 * `packages/plugins/i18n/admin/src/i18n-plugin.ts`). i18n stays free of any
 * dependency on this plugin; we hand it these prebuilt components at runtime.
 */

/** Shape of a locale row once the spaces server patches have decorated it. */
interface SpacesLocaleRow {
  spaces?: Array<{ slug: string }>;
  isDefaultIn?: string[];
}

/**
 * Form section rendered inside i18n's locale create/edit modal. Binds two extra
 * form fields the server-side controller wrapper consumes:
 *   - `spaces`   — visibility binding (empty = platform-wide)
 *   - `defaultIn` — spaces this locale is the default in
 *
 * Cross-field consistency is enforced here rather than server-side so the admin
 * sees the effect immediately: a locale can only be default in a space it's
 * bound to, and picking a default auto-adds the binding.
 */
export const LocaleSpacesFormSection = () => {
  const spacesField = useField<string[]>('spaces');
  const defaultInField = useField<string[]>('defaultIn');

  const spacesValue = Array.isArray(spacesField.value) ? spacesField.value : [];
  const defaultInValue = Array.isArray(defaultInField.value) ? defaultInField.value : [];

  const handleSpacesChange = (next: string[]) => {
    spacesField.onChange('spaces', next);

    if (next.length > 0) {
      const kept = defaultInValue.filter((slug) => next.includes(slug));
      if (kept.length !== defaultInValue.length) {
        defaultInField.onChange('defaultIn', kept);
      }
    }
  };

  const handleDefaultInChange = (next: string[]) => {
    defaultInField.onChange('defaultIn', next);

    // Platform-wide binding (empty `spaces`) already covers every space.
    if (spacesValue.length > 0) {
      const missing = next.filter((slug) => !spacesValue.includes(slug));
      if (missing.length > 0) {
        spacesField.onChange('spaces', [...spacesValue, ...missing]);
      }
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4} paddingTop={6}>
      <SpaceVisibilityField value={spacesValue} onChange={handleSpacesChange} />
      <SpaceDefaultPicker value={defaultInValue} onChange={handleDefaultInChange} />
    </Flex>
  );
};

/**
 * Maps a locale row to the extra form fields' initial values. `spaces` arrives
 * populated by the read-scoping wrapper; `isDefaultIn` by the default-locale
 * strategy's `listDefaults`.
 */
export const getLocaleSpacesInitialValues = (locale?: unknown) => {
  const row = (locale ?? {}) as SpacesLocaleRow;

  return {
    spaces: (row.spaces ?? []).map((s) => s.slug),
    defaultIn: row.isDefaultIn ?? [],
  };
};

export const LocaleSpacesCell = ({ locale }: { locale: unknown }) => (
  <SpaceChipColumn value={((locale ?? {}) as SpacesLocaleRow).spaces?.map((s) => s.slug) ?? []} />
);

export const LocaleDefaultInCell = ({ locale }: { locale: unknown }) => (
  <DefaultInColumn value={((locale ?? {}) as SpacesLocaleRow).isDefaultIn ?? []} />
);
