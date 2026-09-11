import { render, screen } from '@strapi/admin/strapi-admin/test';

import { registerAttributeFlag, resetAttributeFlags } from '../attributeFlagRegistry';
import { AttributeFlags } from '../AttributeFlags';

afterEach(() => {
  resetAttributeFlags();
});

describe('AttributeFlags', () => {
  it('says nothing about a field with no option on', () => {
    render(<AttributeFlags attribute={{ type: 'string' }} />);

    ['Required', 'Unique', 'Private'].forEach((flag) => {
      expect(screen.queryByText(flag)).not.toBeInTheDocument();
    });
  });

  /**
   * The red asterisk after a field's name said this and nothing else; it is a
   * flag now, so the one option that had an affordance must keep it.
   */
  it('flags a required field', () => {
    render(<AttributeFlags attribute={{ type: 'string', required: true }} />);

    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('flags unique and private fields', () => {
    render(<AttributeFlags attribute={{ type: 'string', unique: true, private: true }} />);

    expect(screen.getByText('Unique')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('shows every option a field has, in registration order', () => {
    const { container } = render(
      <AttributeFlags attribute={{ type: 'string', required: true, unique: true, private: true }} />
    );

    expect(container).toHaveTextContent('RequiredUniquePrivate');
  });

  /**
   * `localized` belongs to i18n, which registers it the same way the schema
   * index's columns are registered — so the builder shows it only when the
   * plugin is there to contribute it.
   */
  it('says nothing about a plugin option until the plugin registers it', () => {
    const localized = { type: 'string', pluginOptions: { i18n: { localized: true } } };

    const { unmount } = render(<AttributeFlags attribute={localized} />);
    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
    unmount();

    registerAttributeFlag({
      id: 'i18n',
      label: { id: 'hint', defaultMessage: 'Translated per locale' },
      short: { id: 'short', defaultMessage: 'Internationalization' },
      tone: 'secondary',
      applies: (attribute) =>
        (attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined)?.i18n
          ?.localized === true,
    });

    render(<AttributeFlags attribute={localized} />);
    expect(screen.getByText('Internationalization')).toBeInTheDocument();
  });

  it('replaces a flag registered twice under the same id', () => {
    const flag = {
      id: 'i18n',
      label: { id: 'hint', defaultMessage: 'Translated per locale' },
      short: { id: 'short', defaultMessage: 'Internationalization' },
      tone: 'secondary' as const,
      applies: () => true,
    };

    registerAttributeFlag(flag);
    registerAttributeFlag({ ...flag, short: { id: 'short', defaultMessage: 'Localized' } });

    render(<AttributeFlags attribute={{ type: 'string' }} />);

    expect(screen.getByText('Localized')).toBeInTheDocument();
    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
  });
});
