import { defaultTestStoreConfig, render, screen, server } from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { CTBSessionProvider } from '../../CTBSession/CTBSessionProvider';
import { FormModalNavigationProvider } from '../../FormModalNavigation/FormModalNavigationProvider';
import DataManagerProvider from '../DataManagerProvider';
import { reducer } from '../reducer';
import { useDataManager } from '../useDataManager';

const mockSchema = (settings: Record<string, unknown> | undefined) => {
  server.use(
    http.get('/content-type-builder/schema', () =>
      HttpResponse.json({ data: { contentTypes: {}, components: {}, settings } })
    ),
    http.get('/content-type-builder/reserved-names', () =>
      HttpResponse.json({ models: [], attributes: [] })
    )
  );
};

const Harness = () => {
  const { isLoading, strictRelations } = useDataManager();

  if (isLoading) {
    return <p>loading</p>;
  }

  return <p>strictRelations:{String(strictRelations)}</p>;
};

const setup = () => {
  const base = defaultTestStoreConfig();

  return render(
    <CTBSessionProvider>
      <FormModalNavigationProvider>
        <DataManagerProvider>
          <Harness />
        </DataManagerProvider>
      </FormModalNavigationProvider>
    </CTBSessionProvider>,
    {
      providerOptions: {
        storeConfig: {
          ...base,
          reducer: { ...base.reducer, 'content-type-builder_dataManagerProvider': reducer },
        },
      },
    }
  );
};

describe('CTB | DataManagerProvider | strictRelations', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it.each([
    ['missing', undefined, false],
    ['false', { strictRelations: false }, false],
    ['true', { strictRelations: true }, true],
  ])('exposes the schema setting when it is %s', async (_label, settings, expected) => {
    mockSchema(settings);
    setup();

    expect(await screen.findByText(`strictRelations:${expected}`)).toBeInTheDocument();
  });
});
