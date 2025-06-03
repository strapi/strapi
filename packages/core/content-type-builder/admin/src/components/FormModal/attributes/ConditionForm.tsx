import * as React from 'react';

import { createRulesEngine, type Condition } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  Grid,
  IconButton,
  Typography,
  Field,
  SingleSelect,
  SingleSelectOption,
  Button,
} from '@strapi/design-system';
import { Trash, Plus } from '@strapi/icons';
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

  const rulesEngine = createRulesEngine();
  const condition: Condition = {
    dependsOn: value.dependsOn,
    operator: value.operator,
    value: value.value,
  };

  try {
    rulesEngine.validate(condition);
    const action = value.action === 'show' ? '==' : '!=';
    return {
      visible: {
        [action]: [{ var: value.dependsOn }, value.value],
      },
    };
  } catch (error) {
    return null;
  }
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
  const hasCondition = Boolean(value?.visible);

  // Add safety check for conditionFields
  if (!Array.isArray(conditionFields)) {
    conditionFields = [];
  }

  const selectedField = conditionFields.find((field) => field.name === localValue.dependsOn);
  const isEnumField = selectedField?.type === 'enumeration';

  // Helper to update localValue and propagate JSON Logic
  const updateCondition = (updatedValue: LocalValue) => {
    setLocalValue(updatedValue);
    const rulesEngine = createRulesEngine();
    const condition: Condition = {
      dependsOn: updatedValue.dependsOn,
      operator: updatedValue.operator,
      value: updatedValue.value,
    };
    try {
      rulesEngine.validate(condition);
      const action = updatedValue.action === 'show' ? '==' : '!=';
      const jsonLogic = updatedValue.dependsOn
        ? {
            visible: {
              [action]: [{ var: updatedValue.dependsOn }, updatedValue.value],
            },
          }
        : null;
      if (jsonLogic) {
        onChange({
          target: {
            name,
            value: jsonLogic,
          },
        });
      }
    } catch {
      // Do nothing if invalid
    }
  };

  const handleApplyCondition = () => {
    const initialValue: LocalValue = {
      dependsOn: '',
      operator: 'is',
      value: '',
      action: 'show',
    };
    setLocalValue(initialValue);
    onChange({
      target: {
        name,
        value: convertToJsonLogic(initialValue),
      },
    });
  };

  const handleDelete = () => {
    setLocalValue({
      dependsOn: '',
      operator: 'is',
      value: '',
      action: 'show',
    });
    onChange({
      target: {
        name,
        value: null,
      },
    });
    onDelete();
  };

  const handleFieldChange = (fieldName: string | number) => {
    const newValue = fieldName?.toString() || '';
    const field = conditionFields.find((f) => f.name === newValue);
    const isNewFieldEnum = field?.type === 'enumeration';
    const updatedValue: LocalValue = {
      ...localValue,
      dependsOn: newValue,
      value: newValue ? (isNewFieldEnum ? '' : false) : localValue.value,
    };
    updateCondition(updatedValue);
  };

  const handleOperatorChange = (operator: string | number) => {
    const newValue = operator?.toString() || 'is';
    const updatedValue: LocalValue = {
      ...localValue,
      operator: newValue as 'is' | 'isNot',
    };
    updateCondition(updatedValue);
  };

  const handleValueChange = (newValue: string | number) => {
    const value = isEnumField ? newValue?.toString() : newValue?.toString() === 'true';
    const updatedValue: LocalValue = { ...localValue, value };
    updateCondition(updatedValue);
  };

  const handleActionChange = (action: string | number) => {
    const newValue = action?.toString() || 'show';
    const updatedValue: LocalValue = {
      ...localValue,
      action: newValue as 'show' | 'hide',
    };
    updateCondition(updatedValue);
  };

  if (!hasCondition) {
    return (
      <Box padding={4} margin={4} hasRadius background="neutral0" borderColor="neutral200">
        <Button onClick={handleApplyCondition} startIcon={<Plus />} variant="secondary" fullWidth>
          {formatMessage({
            id: getTrad('form.attribute.condition.apply'),
            defaultMessage: 'Apply condition',
          })}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      padding={6}
      marginTop={4}
      hasRadius
      background="neutral0"
      borderColor="neutral200"
      shadow="tableShadow"
    >
      <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Typography variant="omega">
          Condition for <span style={{ fontWeight: 'bold' }}>{attributeName || name}</span>
        </Typography>
        <IconButton
          onClick={handleDelete}
          label={formatMessage({
            id: getTrad('form.button.delete'),
            defaultMessage: 'Delete',
          })}
        >
          <Trash />
        </IconButton>
      </Flex>
      <Box paddingBottom={2}>
        <Typography
          variant="sigma"
          textColor="neutral600"
          style={{ textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {formatMessage({ id: getTrad('form.attribute.condition.if'), defaultMessage: 'IF' })}
        </Typography>
      </Box>
      <Flex gap={4} marginBottom={4}>
        <Box minWidth={0} flex={1}>
          <Field.Root name={`${name}.field`}>
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
        </Box>
        <Box minWidth={0} flex={1}>
          <Field.Root name={`${name}.operator`}>
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
        </Box>
        <Box minWidth={0} flex={1}>
          <Field.Root name={`${name}.value`}>
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
        </Box>
      </Flex>
      <Box paddingBottom={2}>
        <Typography
          variant="sigma"
          textColor="neutral600"
          style={{ textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {formatMessage({ id: getTrad('form.attribute.condition.then'), defaultMessage: 'THEN' })}
        </Typography>
      </Box>
      <Box>
        <Field.Root name={`${name}.action`}>
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
