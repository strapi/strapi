import omit from 'lodash/omit';

import { isObject } from '../../../../../utils/objects';

import { createArrayOfValues } from './createArrayOfValues';

import type { ChildrenForm } from './forms';
import type { PermissionsDataManagerContextValue } from '../hooks/usePermissionsDataManager';

type ContentTypeKind = 'collectionTypes' | 'singleTypes';

const getActionLocales = (actionData: ChildrenForm[string]): unknown => {
  if (!('properties' in actionData)) {
    return undefined;
  }

  const { properties } = actionData;

  if (!isObject(properties) || !('locales' in properties)) {
    return undefined;
  }

  return properties.locales;
};

const isActionEnabled = (actionData: ChildrenForm[string]) => {
  return createArrayOfValues(omit(actionData, 'conditions')).some((value) => value);
};

const hasSelectedLocales = (locales: unknown) => {
  return createArrayOfValues(locales).some((value) => value);
};

const subjectHasLocaleValidationError = (actions: ChildrenForm = {}): boolean => {
  return Object.values(actions).some((actionData) => {
    const locales = getActionLocales(actionData);

    if (locales === undefined) {
      return false;
    }

    return isActionEnabled(actionData) && !hasSelectedLocales(locales);
  });
};

const hasLocaleValidationErrors = (
  modifiedData: PermissionsDataManagerContextValue['modifiedData']
): boolean => {
  return getLocaleValidationErrorSubjects(modifiedData).length > 0;
};

const getLocaleValidationErrorSubjects = (
  modifiedData: PermissionsDataManagerContextValue['modifiedData']
): Array<{ kind: ContentTypeKind; subject: string }> => {
  const errors: Array<{ kind: ContentTypeKind; subject: string }> = [];

  (['collectionTypes', 'singleTypes'] as const).forEach((kind) => {
    const contentTypes = modifiedData[kind] ?? {};

    Object.entries(contentTypes).forEach(([subject, actions]) => {
      if (subjectHasLocaleValidationError(actions)) {
        errors.push({ kind, subject });
      }
    });
  });

  return errors;
};

const hasLocaleValidationErrorForSubject = (
  modifiedData: PermissionsDataManagerContextValue['modifiedData'],
  kind: ContentTypeKind,
  subject: string
): boolean => {
  const actions = modifiedData[kind]?.[subject];

  if (!actions) {
    return false;
  }

  return subjectHasLocaleValidationError(actions);
};

export { hasLocaleValidationErrors, hasLocaleValidationErrorForSubject };
