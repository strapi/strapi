import { expect, type Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

const MATCH_UID = 'api::match.match';

type ReleaseCondition = 'allow_partial' | 'all_or_nothing';

/**
 * A draft match. `opponent` is required to publish, so a match without one is skipped by a run.
 */
interface MatchData {
  kit_man: string;
  opponent?: string;
}

interface ReleaseOfMatches {
  name: string;
  releaseCondition: ReleaseCondition;
  matches: MatchData[];
  /**
   * Both or neither: a scheduled release needs its timezone. The release is scheduled once its
   * actions are added; pass a function for a time relative to then, e.g. one due in seconds.
   */
  schedule?: { scheduledAt: Date | (() => Date); timezone: string };
}

/**
 * The super admin's token for each page. A page lives for one test, and tests reset the database
 * (admin users included) before they start, so a token is never reused across a reset.
 */
const tokens = new WeakMap<Page, string>();

const getAdminToken = async (page: Page) => {
  const cached = tokens.get(page);
  if (cached) return cached;

  const login = await page.request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  expect(login.ok(), `POST /admin/login: ${await login.text()}`).toBeTruthy();

  const token: string = (await login.json()).data.token;
  tokens.set(page, token);
  return token;
};

/**
 * Calls the admin API as the e2e super admin, expecting success.
 */
const adminRequest = async (
  page: Page,
  method: 'get' | 'post' | 'put',
  url: string,
  data?: object
) => {
  const headers = { Authorization: `Bearer ${await getAdminToken(page)}` };

  const res = await page.request[method](url, { headers, data });
  expect(res.ok(), `${method.toUpperCase()} ${url}: ${await res.text()}`).toBeTruthy();
  return (await res.json()).data;
};

const adminPost = (page: Page, url: string, data: object = {}) =>
  adminRequest(page, 'post', url, data);

/**
 * Creates a release with a publish action for each match, through the admin API: the UI can't
 * create an entry the release can't publish without filling the whole form.
 */
export const createReleaseOfMatches = async (
  page: Page,
  { name, releaseCondition, matches, schedule }: ReleaseOfMatches
) => {
  // Scheduled last: a release due soon would otherwise run, or be due, before it's set up
  const release = await adminPost(page, '/content-releases', {
    name,
    scheduledAt: null,
    timezone: null,
    releaseCondition,
  });

  for (const match of matches) {
    const entry = await adminPost(page, `/content-manager/collection-types/${MATCH_UID}`, match);
    await adminPost(page, `/content-releases/${release.id}/actions`, {
      contentType: MATCH_UID,
      entryDocumentId: entry.documentId,
      type: 'publish',
    });
  }

  if (schedule) {
    const scheduledAt =
      typeof schedule.scheduledAt === 'function' ? schedule.scheduledAt() : schedule.scheduledAt;

    await adminRequest(page, 'put', `/content-releases/${release.id}`, {
      name,
      scheduledAt: scheduledAt.toISOString(),
      timezone: schedule.timezone,
      releaseCondition,
    });
  }

  return release.id as number;
};

/**
 * Runs a release now, as its Publish button does. Resolves to when it ran.
 */
export const publishRelease = async (page: Page, releaseId: number) => {
  const release = await adminPost(page, `/content-releases/${releaseId}/publish`);
  return new Date(release.releasedAt);
};

/**
 * Waits for the scheduler to run a release, polling it until it has a `releasedAt`. Resolves to
 * when it ran. Waits up to 30s, independently of the assertion timeout: schedule the run well
 * within that.
 */
export const waitForScheduledRun = async (page: Page, releaseId: number) => {
  const getReleasedAt = async (): Promise<string | null> =>
    (await adminRequest(page, 'get', `/content-releases/${releaseId}`)).releasedAt;

  await expect.poll(getReleasedAt, { timeout: 30_000 }).not.toBeNull();
  return new Date((await getReleasedAt())!);
};
