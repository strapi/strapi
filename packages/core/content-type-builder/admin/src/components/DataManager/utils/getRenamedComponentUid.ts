import { nameToSlug } from '../../../utils/nameToSlug';

import type { Component } from '../../../types';
import type { Internal } from '@strapi/types';

/**
 * The uid an existing component will have once the server applies a category
 * or display-name change, derived the same way the server does
 * (`getEditedComponentUid` in the CTB schema service): the category half
 * follows the new category, the name half follows the display name only when
 * the display name changed. Returns `null` when the uid does not change.
 */
export const getRenamedComponentUid = (
  component: Component,
  initialComponent: Component | undefined
): Internal.UID.Component | null => {
  if (!initialComponent) {
    return null;
  }

  const [categoryUID, nameUID] = component.uid.split('.');

  const newCategory =
    component.category && component.category !== initialComponent.category
      ? nameToSlug(component.category)
      : categoryUID;

  const displayName = component.info?.displayName;
  const displayNameChanged =
    typeof displayName === 'string' &&
    displayName !== '' &&
    displayName !== initialComponent.info?.displayName;
  const newName = displayNameChanged ? nameToSlug(displayName) : nameUID;

  const newUid = `${newCategory}.${newName}` as Internal.UID.Component;

  return newUid === component.uid ? null : newUid;
};
