import { render, screen } from '@strapi/admin/strapi-admin/test';

import { registerAttributeFlag, resetAttributeFlags } from '../attributeFlagRegistry';
import { AttributeFlags } from '../AttributeFlags';

import type { AttributeLike } from '../attributeFlagRegistry';

afterEach(() => {
  resetAttributeFlags();
});

/** A field rendered among the list it belongs to, which is what sets the columns. */
const show = (attribute: AttributeLike, siblings: AttributeLike[] = [attribute]) =>
  render(<AttributeFlags attribute={attribute} siblings={siblings} />);

const localized = { type: 'string', pluginOptions: { i18n: { localized: true } } };

const i18nFlag = {
  id: 'i18n',
  label: { id: 'hint', defaultMessage: 'Internationalization' },
  short: { id: 'short', defaultMessage: 'Internationalization' },
  tone: 'neutral' as const,
  applies: (attribute: AttributeLike) =>
    (attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n?.localized ===
    true,
};

describe('AttributeFlags', () => {
  it('says nothing about a field whose list uses no flags', () => {
    show({ type: 'string' });

    ['Required', 'Unique', 'Private'].forEach((flag) => {
      expect(screen.queryByText(flag)).not.toBeInTheDocument();
    });
  });

  it('flags a required field', () => {
    show({ type: 'string', required: true });

    expect(screen.getByText('Required')).toBeVisible();
  });

  it('flags unique and private fields', () => {
    show({ type: 'string', unique: true, private: true });

    expect(screen.getByText('Unique')).toBeVisible();
    expect(screen.getByText('Private')).toBeVisible();
  });

  it('shows every option a field has, in registration order', () => {
    const { container } = show({ type: 'string', required: true, unique: true, private: true });

    expect(container).toHaveTextContent('RequiredUniquePrivate');
  });

  /**
   * A column is only worth its width if something in the list is in it — a
   * field list with nothing unique should not carry a unique column.
   */
  it('leaves out a flag no field in the list carries', () => {
    show({ type: 'string', required: true }, [
      { type: 'string', required: true },
      { type: 'string' },
    ]);

    expect(screen.getByText('Required')).toBeVisible();
    expect(screen.queryByText('Unique')).not.toBeInTheDocument();
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });

  /**
   * …and a column something else in the list is in stays, invisible, so the
   * flags read down the list as columns rather than as a ragged edge.
   */
  it('keeps the place of a flag another field in the list carries', () => {
    show({ type: 'string', required: true }, [
      { type: 'string', required: true },
      { type: 'string', unique: true },
    ]);

    expect(screen.getByText('Required')).toBeVisible();
    expect(screen.getByText('Unique')).toBeInTheDocument();
    expect(screen.getByText('Unique')).not.toBeVisible();
  });

  /**
   * `localized` belongs to i18n, which registers it the same way the schema
   * index's columns are registered — so the builder shows it only when the
   * plugin is there to contribute it.
   */
  it('says nothing about a plugin option until the plugin registers it', () => {
    const { unmount } = show(localized);
    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
    unmount();

    registerAttributeFlag(i18nFlag);

    show(localized);
    expect(screen.getByText('Internationalization')).toBeVisible();
  });

  it('replaces a flag registered twice under the same id', () => {
    registerAttributeFlag({ ...i18nFlag, applies: () => true });
    registerAttributeFlag({
      ...i18nFlag,
      short: { id: 'short', defaultMessage: 'Localized' },
      applies: () => true,
    });

    show({ type: 'string' });

    expect(screen.getByText('Localized')).toBeInTheDocument();
    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
  });
});
