import React from 'react';
import { IntlProvider } from 'react-intl';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { RelationInputDataManager } from '..';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

jest.mock('../../../hooks/useRelation', () => ({
  useRelation: jest.fn().mockReturnValue({
    relations: {
      data: {
        pages: [
          {
            results: [
              {
                id: 1,
              },
            ],
          },
        ],
      },
      isFetchingNextPage: false,
      isLoading: false,
      isSuccess: true,
      status: 'success',
    },

    search: {
      data: {},
      isLoading: false,
      isSuccess: true,
    },

    searchFor: jest.fn(),
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({
    isCreatingEntry: true,
    createActionAllowedFields: ['relation'],
    readActionAllowedFields: ['relation'],
    updateActionAllowedFields: ['relation'],
    slug: 'test',
    initialData: {},
    loadRelation: jest.fn(),
  })),
}));

const setup = (props) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en">
            <RelationInputDataManager
              description="Description"
              intlLabel={{
                id: 'label',
                defaultMessage: 'Label',
              }}
              labelAction={<>Action</>}
              mainField={{
                name: 'relation',
                schema: {
                  type: 'relation',
                },
              }}
              name="relation"
              placeholder={{
                id: 'placeholder',
                defaultMessage: 'Placeholder',
              }}
              relationType="oneToOne"
              size={6}
              targetModel="something"
              queryInfos={{
                shouldDisplayRelationLink: true,
              }}
              {...props}
            />
          </IntlProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

describe('RelationInputDataManager', () => {
  test('Does pass through props from the CM', async () => {
    const { findByText } = setup();

    expect(await findByText('Label')).toBeInTheDocument();
    expect(await findByText('Description')).toBeInTheDocument();
    expect(await findByText('Action')).toBeInTheDocument();
    expect(await findByText('Placeholder')).toBeInTheDocument();
  });

  test('Does pass through an error from the CM', async () => {
    const { findByText } = setup({
      error: 'Error',
    });

    expect(await findByText('Error')).toBeInTheDocument();
  });

  test('Sets the disabled prop for morphed relations', async () => {
    const { container } = setup({
      relationType: 'morph',
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Sets the disabled prop for non editable relations (edit entity)', async () => {
    const { container } = setup({
      editable: false,
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Sets the disabled prop for non editable relations (create entity)', async () => {
    const { container } = setup({
      isCreatingEntry: true,
      editable: false,
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Sets the disabled prop if the user does not have all permissions', async () => {
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: false,
      createActionAllowedFields: [],
      readActionAllowedFields: ['relation'],
      updateActionAllowedFields: [],
      slug: 'test',
      initialData: {},
      loadRelation: jest.fn(),
    });

    const { container } = setup({
      isFieldAllowed: false,
      isFieldReadable: true,
    });

    expect(container.querySelector('input')).toHaveAttribute('disabled');
  });

  test('Normalizes relations', () => {});
});
