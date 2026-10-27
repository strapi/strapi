import { defaultTestStoreConfig, render, screen, server } from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { CTBSessionProvider } from '../../CTBSession/CTBSessionProvider';
import { FormModalNavigationProvider } from '../../FormModalNavigation/FormModalNavigationProvider';
import DataManagerProvider from '../DataManagerProvider';
import { reducer } from '../reducer';
import { useDataManager } from '../useDataManager';

// The edit, add and drag controls of the CTB, and the empty state of a type, read this flag
const Probe = () => <p>editable:{String(useDataManager().isInDevelopmentMode)}</p>;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  server.use(
    http.get('/content-type-builder/schema', () =>
      HttpResponse.json({ data: { contentTypes: {}, components: {} } })
    ),
    http.get('/content-type-builder/reserved-names', () =>
      HttpResponse.json({ models: [], attributes: [] })
    )
  );
});
afterAll(() => server.close());

it.each([
  ['update', true],
  ['read', false],
])('with the %s action, the CTB is editable: %s', async (action, editable) => {
  const base = defaultTestStoreConfig();

  render(
    <CTBSessionProvider>
      <FormModalNavigationProvider>
        <DataManagerProvider>
          <Probe />
        </DataManagerProvider>
      </FormModalNavigationProvider>
    </CTBSessionProvider>,
    {
      providerOptions: {
        permissions: (defaults) => [
          ...defaults.filter((p) => !p.action.startsWith('plugin::content-type-builder.')),
          {
            id: 1000,
            action: `plugin::content-type-builder.${action}`,
            subject: null,
            actionParameters: {},
            conditions: [],
            properties: {},
          },
        ],
        storeConfig: {
          ...base,
          reducer: { ...base.reducer, 'content-type-builder_dataManagerProvider': reducer },
        },
      },
    }
  );

  expect(await screen.findByText(`editable:${editable}`)).toBeInTheDocument();
});
