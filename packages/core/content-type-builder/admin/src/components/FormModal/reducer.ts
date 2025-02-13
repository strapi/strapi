import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import set from 'lodash/set';
import snakeCase from 'lodash/snakeCase';
import pluralize from 'pluralize';

import { getRelationType } from '../../utils/getRelationType';
import { nameToSlug } from '../../utils/nameToSlug';

import { createComponentUid } from './utils/createUid';
import { customFieldDefaultOptionsReducer } from './utils/customFieldDefaultOptionsReducer';
import { shouldPluralizeName, shouldPluralizeTargetAttribute } from './utils/relations';

import type { Schema } from '@strapi/types';

type State = {
  formErrors: Record<string, any>;
  modifiedData: Record<string, any>;
  initialData: Record<string, any>;
  componentToCreate: Record<string, any>;
  isCreatingComponentWhileAddingAField: boolean;
};

const initialState: State = {
  formErrors: {},
  modifiedData: {},
  initialData: {},
  componentToCreate: {},
  isCreatingComponentWhileAddingAField: false,
};

type OnChangePayload = {
  keys: string[];
  value: any;
};

type OnChangeRelationTargetPayload = {
  target: {
    oneThatIsCreatingARelationWithAnother: string;
    selectedContentTypeFriendlyName: string;
    targetContentTypeAllowedRelations: Schema.Attribute.RelationKind.Any[] | null;
    value: string;
  };
};

type OnChangeRelationTypePayload = {
  target: {
    oneThatIsCreatingARelationWithAnother: string;
    value: Schema.Attribute.RelationKind.Any;
  };
};

type ResetPropsAndSetFormForAddingAnExistingCompoPayload = {
  options?: Record<string, any>;
};

type ResetPropsAndSaveCurrentDataPayload = {
  options?: Record<string, any>;
};

type SetDataToEditPayload = {
  data: Record<string, any>;
};

type SetAttributeDataSchemaPayload =
  | {
      isEditing: true;
      modifiedDataToSetForEditing: Record<string, any>;
    }
  | {
      isEditing?: false;
      modifiedDataToSetForEditing: Record<string, any>;
      attributeType: string;
      nameToSetForRelation: string;
      targetUid: string;
      step: string | null;
      options?: Record<string, any>;
    };

type SetCustomFieldDataSchemaPayload =
  | {
      isEditing: true;
      modifiedDataToSetForEditing: Record<string, any>;
    }
  | {
      isEditing?: false;
      modifiedDataToSetForEditing: Record<string, any>;
      customField: Record<string, any>;
      options?: Record<string, any>;
    };

type SetDynamicZoneDataSchemaPayload = {
  attributeToEdit: Record<string, any>;
};

type SetErrorsPayload = {
  errors: Record<string, any>;
};

const slice = createSlice({
  name: 'formModal',
  initialState,
  reducers: {
    onChange: (state, action: PayloadAction<OnChangePayload>) => {
      const { keys, value } = action.payload;
      const obj = state.modifiedData;
      const hasDefaultValue = Boolean(obj.default);

      // There is no need to remove the default key if the default value isn't defined
      if (hasDefaultValue && keys.length === 1 && keys.includes('type')) {
        const previousType = obj.type;

        if (previousType && ['date', 'datetime', 'time'].includes(previousType)) {
          // return obj.updateIn(keys, () => value).remove('default');
          delete state.modifiedData.default;
        }
      }

      set(state, ['modifiedData', ...keys], value);
    },
    onChangeRelationTarget: (state, action: PayloadAction<OnChangeRelationTargetPayload>) => {
      const {
        target: {
          oneThatIsCreatingARelationWithAnother,
          selectedContentTypeFriendlyName,
          targetContentTypeAllowedRelations,
          value,
        },
      } = action.payload;
      // Special case for the admin user...
      let didChangeRelationTypeBecauseOfRestrictedRelation = false;
      let changedRelationType: Schema.Attribute.RelationKind.Any | null = null;

      set(state, ['modifiedData', 'target'], value);

      const modifiedData = state.modifiedData;

      // Don't change the relation type if the allowed relations are not restricted
      // TODO: replace with an obj { relation: 'x', bidirctional: true|false } when BE ready
      if (Array.isArray(targetContentTypeAllowedRelations)) {
        const currentRelationType = getRelationType(
          modifiedData.relation,
          modifiedData.targetAttribute
        );

        if (
          currentRelationType &&
          !targetContentTypeAllowedRelations.includes(currentRelationType)
        ) {
          const relationToSet = targetContentTypeAllowedRelations[0];
          didChangeRelationTypeBecauseOfRestrictedRelation = true;
          changedRelationType = relationToSet;

          if (relationToSet === 'oneWay') {
            set(state, ['modifiedData', 'relation'], 'oneToOne');
          } else if (relationToSet === 'manyWay') {
            set(state, ['modifiedData', 'relation'], 'oneToMany');
          } else {
            set(state, ['modifiedData', 'relation'], relationToSet);
          }
        }
      }

      let nameToSet: string;

      if (didChangeRelationTypeBecauseOfRestrictedRelation && changedRelationType) {
        nameToSet = pluralize(
          snakeCase(nameToSlug(selectedContentTypeFriendlyName)),
          shouldPluralizeName(changedRelationType)
        );
      } else {
        nameToSet = pluralize(
          snakeCase(nameToSlug(selectedContentTypeFriendlyName)),

          shouldPluralizeName(modifiedData.relation)
        );
      }

      set(state, ['modifiedData', 'name'], nameToSet);

      const currentTargetAttribute = state.modifiedData.targetAttribute;

      if (currentTargetAttribute === null) {
        return;
      }

      // Changing the target and the relation is either oneWay or manyWay
      // Case when we need to change the relation to oneWay (ex: admin user)
      if (
        didChangeRelationTypeBecauseOfRestrictedRelation &&
        changedRelationType &&
        ['oneWay', 'manyWay'].includes(changedRelationType)
      ) {
        set(state, ['modifiedData', 'targetAttribute'], null);

        return;
      }

      const targetAttributeToSet = pluralize(
        snakeCase(nameToSlug(oneThatIsCreatingARelationWithAnother)),
        shouldPluralizeTargetAttribute(modifiedData.relation)
      );

      set(state, ['modifiedData', 'targetAttribute'], targetAttributeToSet);
    },
    onChangeRelationType: (state, action: PayloadAction<OnChangeRelationTypePayload>) => {
      const {
        target: { oneThatIsCreatingARelationWithAnother, value },
      } = action.payload;

      const currentName = state.modifiedData.name;

      // Switching from oneWay
      if (!['oneWay', 'manyWay'].includes(value)) {
        set(state, ['modifiedData', 'relation'], value);
        const currentTargetAttribute = state.modifiedData.targetAttribute;

        set(
          state,
          ['modifiedData', 'name'],
          pluralize(snakeCase(nameToSlug(currentName)), shouldPluralizeName(value))
        );

        set(
          state,
          ['modifiedData', 'targetAttribute'],
          pluralize(
            currentTargetAttribute || snakeCase(nameToSlug(oneThatIsCreatingARelationWithAnother)),
            shouldPluralizeTargetAttribute(value)
          )
        );

        return;
      }

      if (value === 'oneWay') {
        set(state, ['modifiedData', 'relation'], 'oneToOne');
        set(state, ['modifiedData', 'targetAttribute'], null);
        set(state, ['modifiedData', 'name'], pluralize(snakeCase(currentName), 1));

        return;
      }

      // manyWay
      set(state, ['modifiedData', 'relation'], 'oneToMany');
      set(state, ['modifiedData', 'targetAttribute'], null);
      set(state, ['modifiedData', 'name'], pluralize(snakeCase(currentName), 2));
    },
    resetProps: () => {
      return initialState;
    },
    resetPropsAndSetFormForAddingAnExistingCompo: (
      state,
      action: PayloadAction<ResetPropsAndSetFormForAddingAnExistingCompoPayload>
    ) => {
      const { options = {} } = action.payload;

      return {
        ...initialState,
        modifiedData: {
          type: 'component',
          repeatable: true,
          ...options,
        },
      };
    },
    resetPropsAndSaveCurrentData: (
      state,
      action: PayloadAction<ResetPropsAndSaveCurrentDataPayload>
    ) => {
      const { options = {} } = action.payload;
      // This is run when the user has created a new component
      const componentToCreate = state.modifiedData.componentToCreate;
      const modifiedData = {
        displayName: componentToCreate.displayName,
        type: 'component',
        repeatable: false,
        ...options,
        component: createComponentUid(componentToCreate.displayName, componentToCreate.category),
      };

      return {
        ...initialState,
        componentToCreate,
        modifiedData,
        isCreatingComponentWhileAddingAField: state.modifiedData.createComponent,
      };
    },
    resetPropsAndSetTheFormForAddingACompoToADz: (state) => {
      const createdDZ = state.modifiedData;
      const dataToSet = {
        ...createdDZ,
        createComponent: true,
        componentToCreate: { type: 'component' },
      };

      return { ...initialState, modifiedData: dataToSet };
    },
    setDataToEdit: (state, action: PayloadAction<SetDataToEditPayload>) => {
      const { data } = action.payload;
      state.modifiedData = data;
      state.initialData = data;
    },
    setAttributeDataSchema: (state, action: PayloadAction<SetAttributeDataSchemaPayload>) => {
      const { isEditing } = action.payload;

      if (isEditing) {
        const { modifiedDataToSetForEditing } = action.payload;
        state.modifiedData = modifiedDataToSetForEditing;
        state.initialData = modifiedDataToSetForEditing;

        return;
      }

      const { attributeType, nameToSetForRelation, targetUid, step, options = {} } = action.payload;

      let dataToSet;

      if (attributeType === 'component') {
        if (step === '1') {
          dataToSet = {
            type: 'component',
            createComponent: true,
            componentToCreate: { type: 'component' },
          };
        } else {
          dataToSet = {
            ...options,
            type: 'component',
            repeatable: true,
          };
        }
      } else if (attributeType === 'dynamiczone') {
        dataToSet = {
          ...options,
          type: 'dynamiczone',
          components: [],
        };
      } else if (attributeType === 'text') {
        dataToSet = { ...options, type: 'string' };
      } else if (attributeType === 'number' || attributeType === 'date') {
        dataToSet = options;
      } else if (attributeType === 'media') {
        dataToSet = {
          allowedTypes: ['images', 'files', 'videos', 'audios'],
          type: 'media',
          multiple: true,
          ...options,
        };
      } else if (attributeType === 'enumeration') {
        dataToSet = { ...options, type: 'enumeration', enum: [] };
      } else if (attributeType === 'relation') {
        dataToSet = {
          name: snakeCase(nameToSetForRelation),
          relation: 'oneToOne',
          targetAttribute: null,
          target: targetUid,
          type: 'relation',
        };
      } else {
        dataToSet = { ...options, type: attributeType, default: null };
      }

      state.modifiedData = dataToSet;
    },
    setCustomFieldDataSchema: (state, action: PayloadAction<SetCustomFieldDataSchemaPayload>) => {
      const { isEditing } = action.payload;

      if (isEditing) {
        const { modifiedDataToSetForEditing } = action.payload;
        state.modifiedData = modifiedDataToSetForEditing;
        state.initialData = modifiedDataToSetForEditing;

        return;
      }

      const { customField, options = {} } = action.payload;

      state.modifiedData = { ...options, type: customField.type };

      const allOptions = [
        ...(customField?.options?.base || []),
        ...(customField?.options?.advanced || []),
      ];

      const optionDefaults = allOptions.reduce(customFieldDefaultOptionsReducer, []);

      if (optionDefaults.length) {
        optionDefaults.forEach(({ name, defaultValue }: { name: string; defaultValue: string }) =>
          set(state.modifiedData, name, defaultValue)
        );
      }
    },
    setDynamicZoneDataSchema: (state, action: PayloadAction<SetDynamicZoneDataSchemaPayload>) => {
      const { attributeToEdit } = action.payload;
      state.modifiedData = attributeToEdit;
      state.initialData = attributeToEdit;
    },
    setErrors: (state, action: PayloadAction<SetErrorsPayload>) => {
      state.formErrors = action.payload.errors;
    },
  },
});

export { initialState };
export const { actions, reducer } = slice;
