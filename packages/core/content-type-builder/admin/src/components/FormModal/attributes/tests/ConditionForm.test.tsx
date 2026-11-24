import { render, screen } from '@strapi/admin/strapi-admin/test';
import { IntlProvider } from 'react-intl';

import { pluginId } from '../../../../pluginId';
import fr from '../../../../translations/fr.json';
import { prefixPluginTranslations } from '../../../../utils/prefixPluginTranslations';
import { ConditionForm } from '../ConditionForm';

import type { AttributeConditions } from '../../../../types';

const setup = (value?: AttributeConditions | null, locale?: 'fr') =>
  render(
    locale === 'fr' ? (
      <IntlProvider
        locale="fr"
        messages={prefixPluginTranslations(fr, pluginId)}
        onError={() => {}}
      >
        <ConditionForm
          name="conditions"
          value={value}
          onChange={jest.fn()}
          onDelete={jest.fn()}
          attributeName="subtitle"
          conditionFields={[{ name: 'isFeatured', type: 'boolean' }]}
        />
      </IntlProvider>
    ) : (
      <ConditionForm
        name="conditions"
        value={value}
        onChange={jest.fn()}
        onDelete={jest.fn()}
        attributeName="subtitle"
        conditionFields={[{ name: 'isFeatured', type: 'boolean' }]}
      />
    )
  );

describe('CTB | FormModal | ConditionForm', () => {
  it('treats a null visible condition as no condition', () => {
    setup({ visible: null } as unknown as AttributeConditions);

    expect(screen.getByRole('button', { name: /apply condition/i })).toBeInTheDocument();
  });

  it('translates the apply condition button', () => {
    setup(null, 'fr');

    expect(
      screen.getByRole('button', { name: fr['form.attribute.condition.apply'] })
    ).toBeInTheDocument();
  });

  it('translates the show action of an existing condition', () => {
    setup({ visible: { '==': [{ var: 'isFeatured' }, true] } }, 'fr');

    expect(screen.getByText(fr['form.attribute.condition.action.show'])).toBeInTheDocument();
  });
});
