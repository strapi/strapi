import isEmpty from 'lodash/isEmpty';
import merge from 'lodash/merge';

import { findMatchingPermission } from './permissions';

import type { GenericLayout } from './layouts';
import type {
  Condition,
  SettingPermission,
  ContentPermission,
  Subject,
  SubjectProperty,
} from '../../../../../../../shared/contracts/permissions';
import type { Permission } from '../../../../../../../shared/contracts/shared';

type ConditionForm = Record<string, boolean>;

/**
 * Creates the default condition form: { [conditionId]: false }
 */
const createDefaultConditionsForm = (
  conditions: Condition[],
  initialConditions: Permission['conditions'] = []
): ConditionForm =>
  conditions.reduce<ConditionForm>((acc, current) => {
    acc[current.id] = initialConditions.indexOf(current.id) !== -1;

    return acc;
  }, {});

interface SubCategoryForm {
  properties: {
    enabled: boolean;
  };
  conditions: ConditionForm;
}

type ChildrenForm = Record<
  string,
  SubCategoryForm | (Omit<SubCategoryForm, 'properties'> & PropertyForm)
>;

type Form = Record<string, ChildrenForm>;

const createDefaultForm = <TLayout extends Omit<SettingPermission, 'category'>>(
  layout: GenericLayout<TLayout>[],
  conditions: Condition[],
  initialPermissions: Permission[] = []
) => {
  return layout.reduce<Record<string, Form>>((acc, { categoryId, childrenForm }) => {
    const childrenDefaultForm = childrenForm.reduce<Form>((acc, current) => {
      acc[current.subCategoryId] = current.actions.reduce<ChildrenForm>((acc, current) => {
        const foundMatchingPermission = findMatchingPermission(
          initialPermissions,
          current.action,
          null
        );

        acc[current.action] = {
          properties: {
            enabled: foundMatchingPermission !== undefined,
          },
          conditions: createDefaultConditionsForm(
            conditions,
            foundMatchingPermission?.conditions ?? []
          ),
        };

        return acc;
      }, {});

      return acc;
    }, {});

    acc[categoryId] = childrenDefaultForm;

    return acc;
  }, {});
};

interface PropertyChildForm extends Record<string, boolean | PropertyChildForm> {}

interface PropertyForm {
  properties: PropertyChildForm;
}

/**
 * Creates the default form for all the properties found in a content type's layout
 */
const createDefaultPropertiesForm = (
  properties: string[],
  subject: Subject,
  matchingPermission?: Permission
): PropertyForm => {
  const recursivelyCreatePropertyForm = (
    { children = [] }: SubjectProperty,
    propertyValues: string[],
    prefix = ''
  ): PropertyChildForm => {
    return children.reduce<PropertyChildForm>((acc, current) => {
      if (current.children) {
        return {
          ...acc,
          [current.value]: recursivelyCreatePropertyForm(
            current,
            propertyValues,
            `${prefix}${current.value}.`
          ),
        };
      }

      const hasProperty = propertyValues.indexOf(`${prefix}${current.value}`) !== -1;

      acc[current.value] = hasProperty;

      return acc;
    }, {});
  };

  return properties.reduce<PropertyForm>(
    (acc, currentPropertyName) => {
      const foundProperty = subject.properties.find(({ value }) => value === currentPropertyName);

      if (foundProperty) {
        const matchingPermissionPropertyValues =
          matchingPermission?.properties[foundProperty.value] ?? [];

        const propertyForm = recursivelyCreatePropertyForm(
          foundProperty,
          matchingPermissionPropertyValues
        );

        acc.properties[currentPropertyName] = propertyForm;
      }

      return acc;
    },
    { properties: {} }
  );
};

/**
 * Creates the default for for a content type
 */
const createDefaultCTForm = (
  { subjects, actions = [] }: ContentPermission,
  conditions: Condition[],
  initialPermissions: Permission[] = []
) => {
  return actions.reduce<Form>((defaultForm, action) => {
    type SubjectLayouts = Record<string, Subject>;

    const subjectLayouts = action.subjects.reduce<SubjectLayouts>((acc, current) => {
      const foundLayout = subjects.find(({ uid }) => uid === current) || null;

      if (foundLayout) {
        acc[current] = foundLayout;
      }

      return acc;
    }, {});

    // This can happen when an action is not related to a content type
    // for instance the D&P permission is applied only with the cts that
    // have the D&P features enabled
    if (isEmpty(subjectLayouts)) {
      return defaultForm;
    }

    // The object has the following shape: { [ctUID]: { [actionId]: { [property]: { enabled: false } } } }
    const contentTypesActions = Object.keys(subjectLayouts).reduce<Form>((acc, currentCTUID) => {
      const { actionId, applyToProperties } = action;
      const currentSubjectLayout = subjectLayouts[currentCTUID];
      const properties = currentSubjectLayout.properties.map(({ value }) => value);
      const doesNothaveProperty = properties.every(
        (property) => (applyToProperties || []).indexOf(property) === -1
      );

      const matchingPermission = findMatchingPermission(initialPermissions, actionId, currentCTUID);
      const conditionsForm = createDefaultConditionsForm(
        conditions,
        matchingPermission?.conditions ?? []
      );

      if (!acc[currentCTUID]) {
        acc[currentCTUID] = {};
      }

      if (isEmpty(applyToProperties) || doesNothaveProperty) {
        acc[currentCTUID][actionId] = {
          properties: {
            enabled: matchingPermission !== undefined,
          },
          conditions: conditionsForm,
        };

        return acc;
      }

      const propertiesForm = createDefaultPropertiesForm(
        applyToProperties,
        subjectLayouts[currentCTUID],
        matchingPermission
      );

      acc[currentCTUID][actionId] = { ...propertiesForm, conditions: conditionsForm };

      return acc;
    }, {});

    return merge(defaultForm, contentTypesActions);
  }, {});
};

export { createDefaultConditionsForm, createDefaultForm, createDefaultCTForm };
export type { ConditionForm, Form, PropertyForm, SubCategoryForm, ChildrenForm, PropertyChildForm };
