/* eslint-disable check-file/filename-naming-convention */
import { render, screen } from '@strapi/admin/strapi-admin/test';
import { Route, Routes } from 'react-router-dom';

import { useDataManager } from '../../../components/DataManager/useDataManager';
import ListView from '../ListView';

import type { DataManagerContextValue } from '../../../components/DataManager/DataManagerContext';

jest.mock('../../../components/CTBSession/ctbSession', () => ({
  useCTBTracking: () => ({
    trackUsage: jest.fn(),
  }),
}));

jest.mock('../../../components/DataManager/useDataManager', () => ({
  useDataManager: jest.fn(),
}));

jest.mock('../../../components/FormModalNavigation/useFormModalNavigation', () => ({
  useFormModalNavigation: () => ({
    onOpenModalAddComponentsToDZ: jest.fn(),
    onOpenModalAddField: jest.fn(),
    onOpenModalEditSchema: jest.fn(),
  }),
}));

jest.mock('../../../components/List', () => ({
  List: () => <div />,
}));

jest.mock('../LinkToCMSettingsView', () => ({
  LinkToCMSettingsView: ({ disabled }: { disabled: boolean }) => (
    <button type="button" disabled={disabled}>
      Configure the view
    </button>
  ),
}));

const mockedUseDataManager = jest.mocked(useDataManager);

const contentType = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  visible: true,
  status: 'UNCHANGED',
  info: {
    displayName: 'article',
  },
  plugin: undefined,
  attributes: [{ name: 'title' }],
};

const getDataManagerValue = (
  overrides: Partial<DataManagerContextValue> = {}
): DataManagerContextValue =>
  ({
    isLoading: false,
    isInDevelopmentMode: true,
    contentTypes: {
      'api::article.article': contentType,
    },
    components: {},
    ...overrides,
  }) as unknown as DataManagerContextValue;

const renderListView = () =>
  render(
    <Routes>
      <Route
        path="/plugins/content-type-builder/content-types/:contentTypeUid"
        element={<ListView />}
      />
    </Routes>,
    {
      initialEntries: ['/plugins/content-type-builder/content-types/api::article.article'],
    }
  );

describe('<ListView />', () => {
  beforeEach(() => {
    mockedUseDataManager.mockReturnValue(getDataManagerValue());
  });

  it('shows schema actions in development mode', () => {
    renderListView();

    expect(screen.getByRole('button', { name: 'Configure the view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add another field' })).toBeInTheDocument();
  });

  it('keeps the configure view action outside development mode', () => {
    mockedUseDataManager.mockReturnValue(
      getDataManagerValue({
        isInDevelopmentMode: false,
      })
    );

    renderListView();

    expect(screen.getByRole('button', { name: 'Configure the view' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add another field' })).not.toBeInTheDocument();
  });
});
