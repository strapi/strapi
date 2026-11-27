import { render, screen } from '@strapi/admin/strapi-admin/test';
import { IntlProvider } from 'react-intl';

import { pluginId } from '../../pluginId';
import fr from '../../translations/fr.json';
import { prefixPluginTranslations } from '../../utils/prefixPluginTranslations';
import { AttributeRow } from '../AttributeRow';

import type { ContentType } from '../../types';

jest.mock('../DataManager/useDataManager', () => ({
  useDataManager: () => ({
    contentTypes: {},
    removeAttribute: jest.fn(),
    isInDevelopmentMode: true,
  }),
}));

jest.mock('../FormModalNavigation/useFormModalNavigation', () => ({
  useFormModalNavigation: () => ({
    onOpenModalEditField: jest.fn(),
    onOpenModalEditCustomField: jest.fn(),
  }),
}));

const setup = () =>
  render(
    <IntlProvider locale="fr" messages={prefixPluginTranslations(fr, pluginId)} onError={() => {}}>
      <ul>
        <AttributeRow
          item={{
            id: 'subtitle',
            index: 0,
            name: 'subtitle',
            type: 'string',
            conditions: { visible: { '==': [{ var: 'isFeatured' }, true] } },
          }}
          type={{ uid: 'api::article.article', status: 'UNCHANGED' } as unknown as ContentType}
        />
      </ul>
    </IntlProvider>
  );

describe('CTB | AttributeRow', () => {
  it('translates the conditional badge', () => {
    setup();

    expect(screen.getByText(fr['modelPage.attribute.conditional'])).toBeInTheDocument();
  });
});
