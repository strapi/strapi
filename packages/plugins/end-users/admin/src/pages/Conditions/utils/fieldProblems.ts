import { translatedErrors } from '@strapi/admin/strapi-admin';

import { getTranslation } from '../../../utils/getTranslation';

import { isReservedSlug } from './builderForm';

import type { BuilderForm, FormProblem } from './builderForm';

/** A message for `formatMessage`, so the page words a problem its field shows in its own language */
export interface FieldMessage {
  id: string;
  defaultMessage: string;
  values?: Record<string, string>;
}

type FieldPart = 'slug' | 'displayName' | 'types';

interface SplitProblems {
  /** What each field says about itself, in words the admin would use */
  fields: Partial<Record<FieldPart, FieldMessage>>;
  /** The problems no field shows: they stay in the list above the page */
  rest: FormProblem[];
}

const SLUG_INVALID: FieldMessage = {
  id: getTranslation('conditions.builder.errors.slug'),
  defaultMessage:
    'Use lowercase letters, digits and hyphens, starting with a letter. Up to 63 characters.',
};

const TYPES_MISSING: FieldMessage = {
  id: getTranslation('conditions.builder.errors.types'),
  defaultMessage: 'Choose at least one content type.',
};

/**
 * Sorts what `formProblems` found: the name, the display name and the content types are shown on
 * their fields, with the admin's own wording, and not as keys of the condition's file.
 */
export const splitProblems = (problems: FormProblem[], form: BuilderForm): SplitProblems => {
  const fields: SplitProblems['fields'] = {};
  const rest: FormProblem[] = [];
  const slug = form.slug.trim();

  for (const problem of problems) {
    if (problem.path === 'slug') {
      fields.slug =
        slug === ''
          ? translatedErrors.required
          : isReservedSlug(slug)
            ? {
                id: getTranslation('conditions.builder.errors.slug-reserved'),
                defaultMessage: 'The name "{slug}" is reserved. Choose another.',
                values: { slug },
              }
            : SLUG_INVALID;
    } else if (problem.path === 'displayName') {
      fields.displayName = translatedErrors.required;
    } else if (problem.path === 'appliesTo.types' && form.appliesTo.kind === 'types') {
      // Only the missing choice is a field's to say: a type that can't be granted on is not offered
      if (form.appliesTo.types.length === 0) {
        fields.types = TYPES_MISSING;
      } else {
        rest.push(problem);
      }
    } else {
      rest.push(problem);
    }
  }

  return { fields, rest };
};
