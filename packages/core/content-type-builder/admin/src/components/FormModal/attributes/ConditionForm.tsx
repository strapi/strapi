import * as React from 'react';

import {
  Box,
  Flex,
  Grid,
  IconButton,
  Typography,
  Field,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';

interface ConditionFormProps {
  name: string;
  value: any;
  onChange: (e: { target: { name: string; value: any } }) => void;
  onDelete: () => void;
  attributeName?: string;
  conditionFields?: Array<{
    name: string;
    type: string;
    enum?: string[];
  }>;
  allAttributes?: Array<{
    name: string;
    type: string;
  }>;
}

interface JsonLogicValue {
  visible?: {
    [key: string]: [{ var: string }, any];
  };
}

interface LocalValue {
  dependsOn: string;
  operator: 'is' | 'isNot';
  value: string | boolean;
  action: 'show' | 'hide';
}

const convertFromJsonLogic = (jsonLogic: JsonLogicValue): LocalValue => {
  if (!jsonLogic?.visible) {
    return {
      dependsOn: '',
      operator: 'is',
      value: '',
      action: 'show',
    };
  }

  const [[operator, conditions]] = Object.entries(jsonLogic.visible);
  const [fieldVar, value] = conditions as [{ var: string }, any];

  return {
    dependsOn: fieldVar.var,
    operator: operator === '==' ? 'is' : 'isNot',
    value: value,
    action: operator === '==' ? 'show' : 'hide',
  };
};

const convertToJsonLogic = (value: LocalValue): JsonLogicValue | null => {
  if (!value.dependsOn) {
    return null;
  }

  const operator = value.operator === 'is' ? '==' : '!=';
  const action = value.action === 'show' ? '==' : '!=';

  return {
    visible: {
      [action]: [{ var: value.dependsOn }, value.value],
    },
  };
};

export const ConditionForm = ({
  name,
  value,
  onChange,
  onDelete,
  attributeName,
  conditionFields = [],
}: ConditionFormProps) => {
  const { formatMessage } = useIntl();
  const [localValue, setLocalValue] = React.useState<LocalValue>(convertFromJsonLogic(value));

  // Add safety check for conditionFields
  if (!Array.isArray(conditionFields)) {
    conditionFields = [];
  }

  const selectedField = conditionFields.find((field) => field.name === localValue.dependsOn);
  const isEnumField = selectedField?.type === 'enumeration';

  const handleFieldChange = (fieldName: string | number) => {
    const newValue = fieldName?.toString() || '';
    const field = conditionFields.find((f) => f.name === newValue);
    const isNewFieldEnum = field?.type === 'enumeration';

    // Reset value when changing field type
    const updatedValue: LocalValue = {
      ...localValue,
      dependsOn: newValue,
      value: newValue ? (isNewFieldEnum ? '' : false) : localValue.value,
    };
    setLocalValue(updatedValue);

    // Convert to JSON Logic format
    const jsonLogic = convertToJsonLogic(updatedValue);
    if (jsonLogic) {
      onChange({
        target: {
          name,
          value: jsonLogic,
        },
      });
    }
  };

  const handleOperatorChange = (operator: string | number) => {
    const newValue = operator?.toString() || 'is';
    const updatedValue: LocalValue = {
      ...localValue,
      operator: newValue as 'is' | 'isNot',
    };
    setLocalValue(updatedValue);

    // Convert to JSON Logic format
    const jsonLogic = convertToJsonLogic(updatedValue);
    if (jsonLogic) {
      onChange({
        target: {
          name,
          value: jsonLogic,
        },
      });
    }
  };

  const handleValueChange = (newValue: string | number) => {
    const value = isEnumField ? newValue?.toString() : newValue?.toString() === 'true';
    const updatedValue: LocalValue = { ...localValue, value };
    setLocalValue(updatedValue);

    // Convert to JSON Logic format
    const jsonLogic = convertToJsonLogic(updatedValue);
    if (jsonLogic) {
      onChange({
        target: {
          name,
          value: jsonLogic,
        },
      });
    }
  };

  const handleActionChange = (action: string | number) => {
    const newValue = action?.toString() || 'show';
    const updatedValue: LocalValue = {
      ...localValue,
      action: newValue as 'show' | 'hide',
    };
    setLocalValue(updatedValue);

    // Convert to JSON Logic format
    const jsonLogic = convertToJsonLogic(updatedValue);
    if (jsonLogic) {
      onChange({
        target: {
          name,
          value: jsonLogic,
        },
      });
    }
  };

  return (
    <Box padding={4} hasRadius background="neutral0" borderColor="neutral200">
      <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Typography variant="omega">
          Condition for <span style={{ fontWeight: 'bold' }}>{attributeName || name}</span>
        </Typography>
        <IconButton
          onClick={onDelete}
          label={formatMessage({
            id: getTrad('form.button.delete'),
            defaultMessage: 'Delete',
          })}
        >
          <Trash />
        </IconButton>
      </Flex>
      <Box paddingBottom={2}>
        <Typography variant="sigma" textColor="neutral600" style={{ textTransform: 'uppercase' }}>
          {formatMessage({ id: getTrad('form.attribute.condition.if'), defaultMessage: 'IF' })}
        </Typography>
      </Box>
      <Grid.Root gap={4}>
        <Grid.Item col={4}>
          <Field.Root name={`${name}.field`} required>
            <SingleSelect
              value={localValue.dependsOn}
              onChange={handleFieldChange}
              placeholder={formatMessage({
                id: getTrad('form.attribute.condition.field'),
                defaultMessage: 'field',
              })}
            >
              {conditionFields.map((field) => (
                <SingleSelectOption key={field.name} value={field.name}>
                  <span style={{ fontWeight: 'bold' }}>{field.name}</span>
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Grid.Item>
        <Grid.Item col={4}>
          <Field.Root name={`${name}.operator`} required>
            <SingleSelect
              value={localValue.operator}
              onChange={handleOperatorChange}
              disabled={!localValue.dependsOn}
              placeholder={formatMessage({
                id: getTrad('form.attribute.condition.operator'),
                defaultMessage: 'condition',
              })}
            >
              <SingleSelectOption value="is">
                {formatMessage({
                  id: getTrad('form.attribute.condition.operator.is'),
                  defaultMessage: 'is',
                })}
              </SingleSelectOption>
              <SingleSelectOption value="isNot">
                {formatMessage({
                  id: getTrad('form.attribute.condition.operator.isNot'),
                  defaultMessage: 'is not',
                })}
              </SingleSelectOption>
            </SingleSelect>
          </Field.Root>
        </Grid.Item>
        <Grid.Item col={4}>
          <Field.Root name={`${name}.value`} required>
            <SingleSelect
              value={localValue.value?.toString() || ''}
              onChange={handleValueChange}
              disabled={!localValue.dependsOn}
              placeholder={formatMessage({
                id: getTrad('form.attribute.condition.value'),
                defaultMessage: 'value',
              })}
            >
              {isEnumField && selectedField?.enum ? (
                selectedField.enum.map((enumValue) => (
                  <SingleSelectOption key={enumValue} value={enumValue}>
                    {enumValue}
                  </SingleSelectOption>
                ))
              ) : (
                <>
                  <SingleSelectOption value="true">
                    {formatMessage({
                      id: getTrad('form.attribute.condition.value.true'),
                      defaultMessage: 'true',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="false">
                    {formatMessage({
                      id: getTrad('form.attribute.condition.value.false'),
                      defaultMessage: 'false',
                    })}
                  </SingleSelectOption>
                </>
              )}
            </SingleSelect>
          </Field.Root>
        </Grid.Item>
      </Grid.Root>
      <Box paddingTop={4}>
        <Typography variant="sigma" textColor="neutral600" style={{ textTransform: 'uppercase' }}>
          {formatMessage({ id: getTrad('form.attribute.condition.then'), defaultMessage: 'THEN' })}
        </Typography>
      </Box>
      <Box paddingTop={2}>
        <Field.Root name={`${name}.action`} required>
          <SingleSelect
            value={localValue.action}
            onChange={handleActionChange}
            placeholder={formatMessage({
              id: getTrad('form.attribute.condition.action'),
              defaultMessage: 'action',
            })}
          >
            <SingleSelectOption value="show">
              Show <span style={{ fontWeight: 'bold' }}>{attributeName || name}</span>
            </SingleSelectOption>
            <SingleSelectOption value="hide">
              Hide <span style={{ fontWeight: 'bold' }}>{attributeName || name}</span>
            </SingleSelectOption>
          </SingleSelect>
        </Field.Root>
      </Box>
    </Box>
  );
};
