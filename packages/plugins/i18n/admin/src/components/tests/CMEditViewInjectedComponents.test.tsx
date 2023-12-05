import * as React from 'react';

import {
  ContentManagerEditViewDataManagerContext,
  CMEditViewDataManagerContextValue,
} from '@strapi/helper-plugin';
import { RenderOptions, render as renderBase, screen } from '@tests/utils';

import { CMEditViewInjectedComponents } from '../CMEditViewInjectedComponents';

interface RenderArgs extends Pick<RenderOptions, 'initialEntries'> {
  isLocalized?: boolean;
}

const render = (
  ui: React.ReactElement,
  { isLocalized = true, initialEntries = ['/?plugins[i18n][locale]=en-GB'] }: RenderArgs = {}
) =>
  renderBase(ui, {
    initialEntries,
    renderOptions: {
      wrapper({ children }) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const value: CMEditViewDataManagerContextValue = React.useMemo(
          () => ({
            allLayoutData: {
              components: {},
              contentType: {
                kind: 'collectionType',
                info: {
                  singularName: 'test',
                  pluralName: 'tests',
                  displayName: 'test',
                },
                modelName: 'test',
                globalId: 'test',
                attributes: {},
                modelType: 'contentType',
                uid: 'api::test.test',
                pluginOptions: {
                  i18n: {
                    localized: isLocalized,
                  },
                },
              },
            },
            layout: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
                displayName: 'test',
              },
              modelName: 'test',
              globalId: 'test',
              attributes: {},
              modelType: 'contentType',
              uid: 'api::test.test',
              pluginOptions: {
                i18n: {
                  localized: isLocalized,
                },
              },
            },
            createActionAllowedFields: [],
            formErrors: {},
            hasDraftAndPublish: true,
            initialData: {},
            isCreatingEntry: true,
            isSingleType: false,
            modifiedData: {},
            readActionAllowedFields: [],
            updateActionAllowedFields: [],
            slug: 'foo',
          }),
          []
        );

        return (
          <ContentManagerEditViewDataManagerContext.Provider value={value}>
            {children}
          </ContentManagerEditViewDataManagerContext.Provider>
        );
      },
    },
  });

describe('CMEditViewInjectedComponents', () => {
  it('should not render anything if i18n is not enabled for the content-type', () => {
    render(<CMEditViewInjectedComponents />, {
      isLocalized: false,
    });

    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
  });

  it('should not render anything if the locale is not defined', () => {
    render(<CMEditViewInjectedComponents />, {
      initialEntries: ['/'],
    });

    expect(screen.queryByText('Internationalization')).not.toBeInTheDocument();
  });

  it('should render when there is a locale and i18n is enabled for the content-type', () => {
    render(<CMEditViewInjectedComponents />);

    expect(screen.getByText('Internationalization')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Locales' })).toBeInTheDocument();
  });
});
