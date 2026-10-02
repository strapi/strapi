import type { Core } from '@strapi/types';

type Edition = 'Community' | 'Growth' | 'Enterprise';

/**
 * The plan label of the startup banner: `Community` without an enabled license, `Growth` for a
 * growth plan, else `Enterprise`. A display label, never a gate.
 */
const getEdition = (app: Pick<Core.Strapi, 'EE' | 'ee'>): Edition => {
  if (app.EE !== true) {
    return 'Community';
  }

  return app.ee.planPriceId?.toLowerCase().includes('growth') === true ? 'Growth' : 'Enterprise';
};

export type { Edition };
export { getEdition };
