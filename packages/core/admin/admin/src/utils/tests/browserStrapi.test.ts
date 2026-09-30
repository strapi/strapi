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
  projectType: 'Growth',
  features: [{ name: 'sso' }],
  flags: { nps: true, promoteEE: false, docLinks: true },
  ai: { enabled: true },
};

const respondWith = (data: unknown) =>
  server.use(http.get('*/admin/project-type', () => HttpResponse.json({ data })));

describe('createBrowserStrapi', () => {
  let requestedUrls: string[];
  const originalStrapi = window.strapi;

  beforeEach(() => {
    requestedUrls = [];
    server.events.on('request:start', ({ request }) => requestedUrls.push(request.url));

    /**
     * The shared test setup pre-seeds `window.strapi`; a real admin document has
     * no such global when the bootstrap runs. Removing it means any code that
     * reaches for the global throws instead of silently reading `undefined`.
     */
    // @ts-expect-error - removing the global the shared test setup pre-seeds
    delete window.strapi;
  });

  afterEach(() => {
    server.events.removeAllListeners();
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

  it('enables the seat limit the server lists', async () => {
    respondWith({ ...EE_TRIAL, features: [{ name: 'sso' }, { name: 'seat-limit' }] });

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.features.isEnabled('seat-limit')).toBe(true);
  });

  it('reports no seat limit when the server does not list it', async () => {
    respondWith(EE_TRIAL);

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.features.isEnabled('seat-limit')).toBe(false);
  });

  it('uses the edition label the server computed', async () => {
    respondWith({ ...EE_TRIAL, projectType: 'Enterprise' });

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.projectType).toBe('Enterprise');
  });

  it('falls back to Community when the response omits the edition label', async () => {
    const { projectType: _projectType, ...withoutProjectType } = EE_TRIAL;
    respondWith(withoutProjectType);

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.projectType).toBe('Community');
  });

  it('keeps isTrial a boolean when the response omits it', async () => {
    respondWith(LEGACY_CE);

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.isTrial).toBe(false);
    expect(browserStrapi.isTrialLicense).toBe(false);
    expect(browserStrapi.projectType).toBe('Community');
  });

  it('keeps the Community defaults when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.get('*/admin/project-type', () => new HttpResponse(null, { status: 500 })));

    const browserStrapi = await createBrowserStrapi();

    expect(browserStrapi.isEE).toBe(false);
    expect(browserStrapi.projectType).toBe('Community');
    expect(browserStrapi.features.isEnabled('sso')).toBe(false);
    expect(browserStrapi.features.isEnabled('seat-limit')).toBe(false);
  });
});
