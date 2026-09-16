import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { MySpaces, Space } from '../src/services/api';

export const FRANCE: Space = {
  id: 1,
  documentId: 'space-fr',
  name: 'France',
  slug: 'france',
  status: 'active',
  isDefault: true,
  contentTypes: null,
};

export const GERMANY: Space = {
  id: 2,
  documentId: 'space-de',
  name: 'Germany',
  slug: 'germany',
  status: 'active',
  isDefault: false,
  contentTypes: null,
};

/** What `/spaces/mine` answers, so a test can say who is asking. */
export let mine: MySpaces = {
  data: [FRANCE, GERMANY],
  current: 'france',
  canAccessAll: true,
};

export const setMine = (next: Partial<MySpaces>) => {
  mine = { ...mine, ...next };
};

export const resetMine = () => {
  mine = { data: [FRANCE, GERMANY], current: 'france', canAccessAll: true };
};

export const server = setupServer(
  http.get('*/spaces/mine', () => HttpResponse.json(mine)),
  http.get('*/spaces/spaces', () => HttpResponse.json({ data: [FRANCE, GERMANY] })),
  http.get('*/spaces/settings', () =>
    HttpResponse.json({
      data: {
        contentTypes: [{ uid: 'api::article.article', displayName: 'Article' }],
        maxSpaces: null,
        sharedRows: {},
      },
    })
  ),
  http.get('*/spaces/ownership', () =>
    HttpResponse.json({ data: { 'doc-1': { id: 1, name: 'France', slug: 'france' } } })
  )
);
