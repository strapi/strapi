'use strict';

/**
 * Test domains whose specs can't run in this e2e run, so the runner doesn't start Strapi for them.
 *
 * Both rules follow how the specs gate themselves. `tests/utils/__tests__/e2e-domains.test.ts`
 * checks that every spec in these domains is gated that way, so a new ungated spec fails there
 * instead of being skipped here.
 */

/** Every Media Library spec is gated on `E2E_MEDIA_LIBRARY`, which only the dedicated jobs set. */
const MEDIA_LIBRARY_DOMAIN = 'media-library';
const MEDIA_LIBRARY_SUITES = ['current', 'legacy'];

/** Enterprise-only features: every spec is `describeOnCondition(edition === 'EE')`. */
const EE_ONLY_DOMAINS = ['content-releases', 'review-workflows'];

/**
 * @param {string[]} domains the selected domains
 * @param {{ isCE: boolean, mediaLibrarySuite?: string }} env
 * @returns {{ runnable: string[], skipped: Array<{ domain: string, reason: string }> }}
 */
const selectRunnableDomains = (domains, { isCE, mediaLibrarySuite }) => {
  const reasons = new Map();

  if (!MEDIA_LIBRARY_SUITES.includes(mediaLibrarySuite)) {
    reasons.set(MEDIA_LIBRARY_DOMAIN, 'its specs only run when E2E_MEDIA_LIBRARY is set');
  }

  if (isCE) {
    for (const domain of EE_ONLY_DOMAINS) {
      reasons.set(domain, 'its specs only run in the Enterprise Edition');
    }
  }

  return {
    runnable: domains.filter((domain) => !reasons.has(domain)),
    skipped: domains
      .filter((domain) => reasons.has(domain))
      .map((domain) => ({ domain, reason: reasons.get(domain) })),
  };
};

module.exports = {
  EE_ONLY_DOMAINS,
  MEDIA_LIBRARY_DOMAIN,
  selectRunnableDomains,
};
