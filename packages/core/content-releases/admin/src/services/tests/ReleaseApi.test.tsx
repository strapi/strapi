import { unstable_useDocumentActions as useDocumentActions } from '@strapi/content-manager/strapi-admin';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useGetReleaseActionsQuery } from '../release';

const MODEL = 'api::article.article';

const ReleaseEntries = () => {
  useGetReleaseActionsQuery({ releaseId: '1' });

  return null;
};

const EntryActions = () => {
  const { publish, unpublish } = useDocumentActions();
  const entry = { collectionType: 'collection-types', model: MODEL, documentId: 'article-1' };

  return (
    <>
      <button type="button" onClick={() => publish(entry, { title: 'Fixed title' })}>
        Publish entry
      </button>
      <button type="button" onClick={() => unpublish(entry)}>
        Unpublish entry
      </button>
    </>
  );
};

describe('release service', () => {
  it.each(['Publish entry', 'Unpublish entry'])(
    "refreshes a release's entries after %s in the Content Manager",
    async (button) => {
      let actionsRequests = 0;
      server.use(
        http.get('/content-releases/:releaseId/actions', () => {
          actionsRequests += 1;

          return HttpResponse.json({
            data: {},
            meta: {
              pagination: { page: 1, pageSize: 10, total: 0, pageCount: 0 },
              contentTypes: {},
              components: {},
            },
          });
        }),
        // A wildcard: the "::" of the uid would read as path parameters
        http.post('/content-manager/collection-types/*', () =>
          HttpResponse.json({ data: { documentId: 'article-1' }, meta: {} })
        )
      );

      const { user } = render(
        <>
          <ReleaseEntries />
          <EntryActions />
        </>
      );

      await waitFor(() => expect(actionsRequests).toBe(1));

      await user.click(screen.getByRole('button', { name: button }));

      // Readiness changes with the entry: the release page must not show the cached one
      await waitFor(() => expect(actionsRequests).toBe(2));
    }
  );
});
