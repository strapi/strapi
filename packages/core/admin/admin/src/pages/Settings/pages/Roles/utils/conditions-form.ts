import type { Condition } from '../../../../../../../shared/contracts/permissions';
import type { ConditionForm } from './forms';

/**
 * Local form state of the conditions modal, grouped by condition category:
 * `{ [actionName]: { [categoryName]: { [conditionId]: boolean } } }`.
 */
export type ConditionsFormState = Record<string, Record<string, ConditionForm>>;

export type ConditionsCategoryOptions = Array<[categoryName: string, conditions: Condition[]]>;

/**
 * Applies a change coming from the nested multi-select to the form state.
 *
 * `values` is a flat `{ [conditionId]: boolean }` map covering every available
 * condition across all categories. Each entry is written back into its own
 * category bucket. Writing everything into a single bucket (e.g. `default`)
 * lets the submit-time merge clobber fresh values with stale ones, so
 * conditions in a custom category could never be persisted (#27461).
 */
export const applyConditionsFormChange = (
  state: ConditionsFormState,
  name: string,
  values: ConditionForm,
  arrayOfOptionsGroupedByCategory: ConditionsCategoryOptions
): ConditionsFormState => {
  const categories = Object.fromEntries(
    arrayOfOptionsGroupedByCategory.map(([categoryName, relatedConditions]) => [
      categoryName,
      relatedConditions.reduce<ConditionForm>((acc, condition) => {
        acc[condition.id] = values[condition.id] ?? false;
        return acc;
      }, {}),
    ])
  );

  return { ...state, [name]: categories };
};

/**
 * Flattens the per-category buckets back into the `{ [conditionId]: boolean }`
 * shape the permissions data manager expects.
 */
export const mergeConditionsForm = (state: ConditionsFormState): Record<string, ConditionForm> =>
  Object.entries(state).reduce<Record<string, ConditionForm>>((acc, [key, value]) => {
    acc[key] = Object.values(value).reduce<ConditionForm>(
      (merged, bucket) => ({ ...merged, ...bucket }),
      {}
    );

    return acc;
  }, {});

/**
 * Builds the flat `{ [conditionId]: boolean }` change map from the ids selected
 * in the nested multi-select.
 */
export const getNewStateFromChangedValues = (
  options: ConditionsCategoryOptions,
  changedValues: string[]
): ConditionForm =>
  options
    .map(([, values]) => values)
    .flat()
    .reduce<ConditionForm>(
      (acc, curr) => ({ [curr.id]: changedValues.includes(curr.id), ...acc }),
      {}
    );

/**
 * Returns the ids of every selected condition across all category buckets.
 */
export const getSelectedValues = (rawValue: Record<string, ConditionForm>): string[] =>
  Object.values(rawValue)
    .map((bucket) =>
      Object.entries(bucket)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
    .flat();
