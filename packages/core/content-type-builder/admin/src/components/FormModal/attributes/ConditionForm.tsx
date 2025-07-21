import * as React from 'react';
import { useState } from 'react';

import { createRulesEngine, ConfirmDialog, type Condition } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  IconButton,
  Typography,
  Field,
  SingleSelect,
  SingleSelectOption,
  Dialog,
} from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { AttributeIcon } from '../../../components/AttributeIcon';
import { getTrad } from '../../../utils/getTrad';
import { ApplyConditionButton } from '../../ApplyConditionButton';

const SmallAttributeIcon = styled(AttributeIcon)`
  width: 16px !important;
  height: 16px !important;
  svg {
    width: 16px !important;
    height: 16px !important;
  }
`;

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

  // Assume 'visible' implies 'show' for now; adjust if backend uses 'hidden' key
  return {
    dependsOn: fieldVar.var,
    operator: operator === '==' ? 'is' : 'isNot',
    value: value,
    action: 'show', // Default to 'show' for 'visible'; adjust based on backend logic
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
    // Determine JSON Logic operator based on operator and action
    const operator =
      (value.operator === 'is' && value.action === 'show') ||
      (value.operator === 'isNot' && value.action === 'hide')
        ? '=='
        : '!=';
    return {
      visible: {
        [operator]: [{ var: value.dependsOn }, value.value],
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
      const operator =
        (updatedValue.operator === 'is' && updatedValue.action === 'show') ||
        (updatedValue.operator === 'isNot' && updatedValue.action === 'hide')
          ? '=='
          : '!=';
      const jsonLogic = updatedValue.dependsOn
        ? {
            visible: {
              [operator]: [{ var: updatedValue.dependsOn }, updatedValue.value],
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
      // Optionally, show an error to the user
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
    setShowConfirmDialog(false);
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
        <ApplyConditionButton onClick={handleApplyCondition} />
      </Box>
    );
  }

  return (
    <Box marginTop={2}>
      <Box
        background="neutral0"
        hasRadius
        borderColor="neutral200"
        borderWidth={0.5}
        borderStyle="solid"
      >
        <Flex justifyContent="space-between" alignItems="center" padding={4}>
          <Typography variant="sigma" textColor="neutral800">
            {formatMessage(
              {
                id: getTrad('form.attribute.condition.title'),
                defaultMessage: 'Condition for {name}',
              },
              {
                name: <strong>{attributeName}</strong>,
              }
            )}
          </Typography>
          <Dialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <Dialog.Trigger>
              <IconButton label="Delete">
                <Trash />
              </IconButton>
            </Dialog.Trigger>
            <ConfirmDialog onConfirm={handleDelete}>
              {formatMessage({
                id: getTrad('popUpWarning.bodyMessage.delete-condition'),
                defaultMessage: 'Are you sure you want to delete this condition?',
              })}
            </ConfirmDialog>
          </Dialog.Root>
        </Flex>

        <Box background="neutral100" padding={4}>
          <Box paddingBottom={2}>
            <Typography
              variant="sigma"
              textColor="neutral600"
              style={{ textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {formatMessage({ id: getTrad('form.attribute.condition.if'), defaultMessage: 'IF' })}
            </Typography>
          </Box>
          <Flex gap={4}>
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
                      <Flex gap={2} alignItems="center">
                        <SmallAttributeIcon type={field.type} />
                        <span>{field.name}</span>
                      </Flex>
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
        </Box>

        <Box background="neutral100" padding={4}>
          <Box paddingBottom={4}>
            <Typography
              variant="sigma"
              textColor="neutral600"
              style={{ textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {formatMessage({
                id: getTrad('form.attribute.condition.then'),
                defaultMessage: 'THEN',
              })}
            </Typography>
          </Box>
          <Box paddingBottom={4}>
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
      </Box>
    </Box>
  );
};
