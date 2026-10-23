import { yup } from '@strapi/utils';
import { lifecyclesValidator } from '../lifecycles';

export type ComponentLifecycles = Record<string, unknown>;

/**
 * Validates the lifecycles module declared next to a component schema
 * (`src/components/<category>/<name>.lifecycles.js`).
 *
 * Throws a readable error naming the component when the module is invalid.
 */
const validateComponentLifecycles = (uid: string, lifecycles: unknown): ComponentLifecycles => {
  try {
    return lifecyclesValidator.validateSync(lifecycles, {
      strict: true,
      abortEarly: false,
    }) as ComponentLifecycles;
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      throw new Error(`Component lifecycles are invalid for ${uid}.\n${e.errors}`);
    }

    throw e;
  }
};

export { validateComponentLifecycles };
