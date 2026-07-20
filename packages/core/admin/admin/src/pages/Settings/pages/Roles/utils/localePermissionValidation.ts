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
  return createArrayOfValues(omit(actionData, 'conditions')).some(Boolean);
};

const hasSelectedLocales = (locales: unknown) => {
  return createArrayOfValues(locales).some(Boolean);
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
  return (['collectionTypes', 'singleTypes'] as const).some((kind) =>
    Object.values(modifiedData[kind] ?? {}).some(subjectHasLocaleValidationError)
  );
};

const getLocaleValidationErrorActionKeys = (
  modifiedData: PermissionsDataManagerContextValue['modifiedData'],
  kind: ContentTypeKind,
  subject: string
): string[] => {
  const actions = modifiedData[kind]?.[subject];

  if (!actions) {
    return [];
  }

  return Object.keys(actions).filter((actionKey) => {
    const actionData = actions[actionKey];
    const locales = getActionLocales(actionData);

    if (locales === undefined) {
      return false;
    }

    return isActionEnabled(actionData) && !hasSelectedLocales(locales);
  });
};

export { hasLocaleValidationErrors, getLocaleValidationErrorActionKeys };
