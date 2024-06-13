import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { InputRenderer } from '../InputRenderer';

const mockUseField = jest.fn();

jest.mock('../../../../hooks/useDocument', () => ({
  useDoc: () => ({
    id: '1',
    components: {
      'unique.all': {
        uid: 'unique.all',
        apiID: 'all',
        isDisplayed: true,
        category: 'unique',
        info: {
          displayName: 'All',
          description: 'Contains all the unique fields types.',
        },
        attributes: {
          id: { type: 'integer' },
          ComponentTextShort: { type: 'string', unique: true },
          // TODO add more field types...
        },
      },
      'unique.top-level': {
        uid: 'unique.top-level',
        isDisplayed: true,
        apiID: 'top-level',
        category: 'unique',
        info: {
          displayName: 'Top Level',
          description: 'Contains a nested component with all the possible unique field types.',
        },
        attributes: {
          id: { type: 'integer' },
          nestedUnique: {
            type: 'component',
            repeatable: false,
            component: 'unique.all',
          },
        },
      },
      // 'unique.top-level': {
      //   uid: 'unique.top-level',
      //   isDisplayed: true,
      //   apiID: 'top-level',
      //   category: 'unique',
      //   info: {
      //     displayName: 'Top Level',
      //     description: 'Contains a nested component.',
      //   },
      //   attributes: {
      //     id: { type: 'integer' },
      //     nestedComponentOne: {
      //       type: 'component',
      //       repeatable: false,
      //       component: 'unique.level-one',
      //     },
      //   },
      // },
      // 'unique.level-one': {
      //   uid: 'unique.level-one',
      //   isDisplayed: true,
      //   apiID: 'level-one',
      //   category: 'unique',
      //   info: {
      //     displayName: 'Level One',
      //     description: 'Contains a nested component.',
      //   },
      //   attributes: {
      //     id: { type: 'integer' },
      //     nestedComponentTwo: {
      //       type: 'component',
      //       repeatable: false,
      //       component: 'unique.level-two',
      //     },
      //   },
      // },
      // 'unique.level-two': {
      //   uid: 'unique.level-two',
      //   isDisplayed: true,
      //   apiID: 'level-two',
      //   category: 'unique',
      //   info: {
      //     displayName: 'Level Two',
      //     description: 'Contains a nested component with all the possible unique field types.',
      //   },
      //   attributes: {
      //     id: { type: 'integer' },
      //     nestedComponentThree: {
      //       type: 'component',
      //       repeatable: false,
      //       component: 'unique.all',
      //     },
      //   },
      // },
    },
  }),
}));

jest.mock('../../../../hooks/useDocumentLayout', () => ({
  useDocLayout: () => ({
    edit: {
      components: {
        'unique.top-level': {
          layout: [
            [
              {
                attribute: {
                  type: 'component',
                  repeatable: false,
                  component: 'unique.all',
                  pluginOptions: {
                    i18n: {
                      localized: true,
                    },
                  },
                },
                disabled: false,
                label: 'nestedUnique',
                name: 'nestedUnique',
                type: 'component',
                unique: false,
                visible: true,
              },
            ],
          ],
          settings: {
            bulkable: true,
            filterable: true,
            searchable: true,
            pageSize: 10,
            mainField: 'id',
            defaultSortBy: 'id',
            defaultSortOrder: 'ASC',
            displayName: 'Top Level',
          },
        },
        'unique.all': {
          layout: [
            [
              {
                attribute: {
                  pluginOptions: {
                    i18n: {
                      localized: true,
                    },
                  },
                  type: 'string',
                  unique: true,
                },
                disabled: false,
                hint: '',
                label: 'ComponentTextShort',
                name: 'ComponentTextShort',
                type: 'string',
                unique: true,
                visible: true,
                required: false,
              },
            ],
          ],
          settings: {
            bulkable: true,
            filterable: true,
            searchable: true,
            pageSize: 10,
            mainField: 'ComponentTextShort',
            defaultSortBy: 'ComponentTextShort',
            defaultSortOrder: 'ASC',
            displayName: 'All',
          },
        },
      },
    },
  }),
}));

jest.mock('../../../../features/DocumentRBAC', () => ({
  // Allow all actions by default
  useDocumentRBAC: () => () => true,
}));

jest.mock('../../../../hooks/useLazyComponents', () => ({
  useLazyComponents: () => ({
    lazyComponentStore: {},
  }),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn(() =>
    // Return empty fields
    ({})
  ),
  useForm: () => ({ disabled: false }),
  useField: () => mockUseField(),
}));

const render = (ui: React.ReactElement) =>
  renderRTL(
    ui
    // Render Options
  );

describe('InputRenderer', () => {
  // it.skip('renders correctly with visible prop', () => {
  //   render(
  //     <IntlProvider locale="en">
  //       <InputRenderer visible={true} hint="Test hint" type="text" name="test" />
  //     </IntlProvider>
  //   );

  //   expect(screen.getByText('Test hint')).toBeInTheDocument();
  // });

  // it.skip('does not render when visible prop is false', () => {
  //   const { container } = render(
  //     <IntlProvider locale="en">
  //       <InputRenderer visible={false} hint="Test hint" type="text" name="test" />
  //     </IntlProvider>
  //   );

  //   expect(container).toBeEmptyDOMElement();
  // });

  it('should display an error when there is an error in a nested component', () => {
    const value = [
      {
        nestedUnique: {
          ComponentTextShort: 'Duplicate',
        },
      },
      {
        nestedUnique: {
          ComponentTextShort: 'Duplicate',
        },
      },
      // TODO modify value to test for further nesting of components...
      // {
      //   nestedComponentOne: {
      //     nestedComponentTwo: {
      //       nestedComponentThree: {
      //         ComponentTextShort: 'Duplicate',
      //       },
      //     },
      //   },
      // },
      // {
      //   nestedComponentOne: {
      //     nestedComponentTwo: {
      //       nestedComponentThree: {
      //         ComponentTextShort: 'Duplicate',
      //       },
      //     },
      //   },
      // },
    ];

    mockUseField.mockReturnValue({
      value,
      error:
        // The error is not on the repeatable component but nested on a field
        // within. We are testing that it can still be surfaced
        undefined,
    });

    const { getByText } = render(
      <DesignSystemProvider>
        <MemoryRouter>
          <IntlProvider locale="en">
            <InputRenderer
              type="component"
              visible={true}
              required={false}
              unique={false}
              disabled={false}
              hint=""
              placeholder=""
              label="nestedUnique"
              name="nestedUnique"
              mainField={{
                name: 'id',
                type: 'integer',
              }}
              attribute={{
                type: 'component',
                repeatable: true,
                component: 'unique.top-level',
              }}
              layout={[
                [
                  {
                    label: 'nestedUnique',
                    name: 'nestedUnique',
                    type: 'component',
                    required: false,
                    unique: false,
                    visible: true,
                    attribute: {
                      type: 'component',
                      repeatable: true,
                      component: 'unique.top-level',
                    },
                  },
                ],
              ]}
              value={value}
            />
          </IntlProvider>
        </MemoryRouter>
      </DesignSystemProvider>
    );

    expect(getByText('This attribute must be unique')).toBeInTheDocument();
  });
});
