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

/**
 * Creates an unscheduled release with a publish action for each match, through the admin API: the
 * UI can't create an entry the release can't publish without filling the whole form.
 */
export const createReleaseOfMatches = async (
  page: Page,
  {
    name,
    releaseCondition,
    matches,
  }: { name: string; releaseCondition: ReleaseCondition; matches: MatchData[] }
) => {
  const login = await page.request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const headers = { Authorization: `Bearer ${(await login.json()).data.token}` };

  const post = async (url: string, data: object) => {
    const res = await page.request.post(url, { headers, data });
    expect(res.ok(), `POST ${url}: ${await res.text()}`).toBeTruthy();
    return (await res.json()).data;
  };

  const release = await post('/content-releases', {
    name,
    scheduledAt: null,
    timezone: null,
    releaseCondition,
  });

  for (const match of matches) {
    const entry = await post(`/content-manager/collection-types/${MATCH_UID}`, match);
    await post(`/content-releases/${release.id}/actions`, {
      contentType: MATCH_UID,
      entryDocumentId: entry.documentId,
      type: 'publish',
    });
  }

  return release.id as number;
};
