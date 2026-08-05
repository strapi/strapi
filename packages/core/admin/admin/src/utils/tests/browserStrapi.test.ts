import { server } from '@tests/server';
import { http, HttpResponse } from 'msw';

import { createBrowserStrapi } from '../browserStrapi';

/** CE payload as served before `isTrial` was added to the contract. */
const LEGACY_CE = {
  isEE: false,
  features: [],
  flags: { nps: false, promoteEE: true, docLinks: true },
  ai: { enabled: false },
};

const EE_TRIAL = {
  isEE: true,
  isTrial: true,
  planPriceId: 'price_growth_monthly',
  features: [{ name: 'sso' }],
  flags: { nps: true, promoteEE: false, docLinks: true },
  ai: { enabled: true },
};

const respondWith = (data: unknown) =>
  server.use(http.get('*/admin/project-type', () => HttpResponse.json({ data })));

describe('createBrowserStrapi', () => {
  let requestedUrls: string[];
  let mountNode: HTMLDivElement;
  const originalStrapi = window.strapi;

  beforeEach(() => {
    requestedUrls = [];
    server.events.on('request:start', ({ request }) => requestedUrls.push(request.url));

    /**
     * Reproduce a real admin document: no `window.strapi` yet, but a `#strapi`
     * mount node that browsers expose as a named window property.
     */
    mountNode = document.createElement('div');
    mountNode.id = 'strapi';
    document.body.appendChild(mountNode);
    // @ts-expect-error - removing the global the shared test setup pre-seeds
    delete window.strapi;
  });

  afterEach(() => {
    server.events.removeAllListeners();
    mountNode.remove();
    window.strapi = originalStrapi;
  });

  it('resolves the backend URL without reading the unassigned global', async () => {
    respondWith(LEGACY_CE);

    await createBrowserStrapi();

    expect(requestedUrls).toContain(`${window.location.origin}/admin/project-type`);
  });

  it('applies the EE response', async () => {
    respondWith(EE_TRIAL);

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.isEE).toBe(true);
    expect(browserStrapi.projectType).toBe('Growth');
    expect(browserStrapi.features.isEnabled('sso')).toBe(true);
    expect(browserStrapi.isTrial).toBe(true);
    expect(browserStrapi.isTrialLicense).toBe(true);
  });

  it('keeps isTrial a boolean when the response omits it', async () => {
    respondWith(LEGACY_CE);

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.isTrial).toBe(false);
    expect(browserStrapi.isTrialLicense).toBe(false);
    expect(browserStrapi.projectType).toBe('Community');
  });
});
