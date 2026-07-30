import type {
  AnyAttribute,
  AttributeConditionValue,
  AttributeConditions,
  ContentTypes,
} from '../types';

interface DependentRow {
  contentTypeUid: string;
  contentType: string;
  attribute: string;
}

type VisibleConditionEntry = {
  operator: string;
  fieldVar: { var: string };
  value: AttributeConditionValue;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFieldVar = (value: unknown): value is { var: string } =>
  isRecord(value) && typeof value.var === 'string';

const isAttributeConditionValue = (value: unknown): value is AttributeConditionValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

export const getVisibleConditionEntries = (
  condition?: AttributeConditions | null
): VisibleConditionEntry[] => {
  const visible = condition?.visible;

  if (!isRecord(visible)) {
    return [];
  }

  return Object.entries(visible).reduce<VisibleConditionEntry[]>((entries, [operator, rule]) => {
    if (!Array.isArray(rule)) {
      return entries;
    }

    const [fieldVar, value] = rule;

    if (!isFieldVar(fieldVar) || !isAttributeConditionValue(value)) {
      return entries;
    }

    entries.push({ operator, fieldVar, value });

    return entries;
  }, []);
};

export const getFirstVisibleConditionEntry = (condition?: AttributeConditions | null) =>
  getVisibleConditionEntries(condition)[0] ?? null;

export const checkDependentRows = (
  contentTypes: ContentTypes,
  fieldName: string
): DependentRow[] => {
  const dependentRows: DependentRow[] = [];

  Object.entries(contentTypes).forEach(([contentTypeUid, contentType]) => {
    if (contentType.attributes !== undefined) {
      // Handle both array and object formats of attributes
      const attributes = Array.isArray(contentType.attributes)
        ? contentType.attributes.reduce<Record<string, AnyAttribute>>((acc, attr, index) => {
            acc[index.toString()] = attr;
            return acc;
          }, {})
        : contentType.attributes;

      Object.entries(attributes).forEach(([attrName, attr]) => {
        getVisibleConditionEntries(attr.conditions).forEach(({ fieldVar }) => {
          // Check if this condition references our field
          if (fieldVar.var === fieldName) {
            dependentRows.push({
              contentTypeUid,
              contentType: contentType.info.displayName,
              attribute: attr.name || attrName,
            });
          }
        });
      });
    }
  });
  return dependentRows;
};

export const formatCondition = (
  condition: AttributeConditions,
  availableFields: Array<{ name: string; type: string }>,
  attributeName: string
): string => {
  const conditionEntry = getFirstVisibleConditionEntry(condition);

  if (conditionEntry === null) {
    return '';
  }

  const { operator, fieldVar, value } = conditionEntry;

  const dependsOnField = availableFields.find((field) => field.name === fieldVar.var);
  const dependsOnFieldName = dependsOnField ? dependsOnField.name : fieldVar.var;

  const operatorText = operator === '==' ? 'is' : 'is not';
  const valueText = String(value);
  const actionText = operator === '==' ? 'Show' : 'Hide';

  return `If ${dependsOnFieldName} ${operatorText} ${valueText}, then ${actionText} ${attributeName}`;
};

export const getAvailableConditionFields = (
  attributes: AnyAttribute[],
  currentFieldName: string
) => {
  return attributes
    .filter((attr) => {
      // Only include boolean and enum fields
      const isCorrectType = attr.type === 'boolean' || attr.type === 'enumeration';
      // Exclude the current field to prevent self-referential conditions
      const isNotCurrentField = attr.name !== currentFieldName;
      return isCorrectType && isNotCurrentField;
    })
    .map((attr) => ({
      name: attr.name,
      type: attr.type,
      enum: attr.type === 'enumeration' ? attr.enum : undefined,
    }));
};
