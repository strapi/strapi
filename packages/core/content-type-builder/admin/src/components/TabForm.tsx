import { useState } from 'react';

import { Box, Grid, Typography, Button, Field } from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

import { GenericInput } from './GenericInputs';

interface TabFormProps {
  form: Array<Record<string, any>>;
  formErrors: Record<string, any>;
  genericInputProps: Record<string, any>;
  modifiedData: Record<string, any>;
  onChange: (value: any) => void;
}

/* eslint-disable react/no-array-index-key */
export const TabForm = ({
  form,
  formErrors,
  genericInputProps,
  modifiedData,
  onChange,
}: TabFormProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      {form.map((section, sectionIndex) => {
        // Don't display an empty section
        if (section.items.length === 0) {
          return null;
        }
        return (
          <Box key={sectionIndex}>
            {section.sectionTitle && (
              <Box paddingBottom={4}>
                <Typography variant="delta" tag="h3">
                  {formatMessage(section.sectionTitle)}
                </Typography>
              </Box>
            )}
            {section.intlLabel && (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage(section.intlLabel)}
              </Typography>
            )}

            <Grid.Root gap={4}>
              {section.items.map((input: any, i: number) => {
                const key = `${sectionIndex}.${i}`;

                /**
                 * Use undefined as the default value because not every input wants a string e.g. Date pickers
                 */
                const value = get(modifiedData, input.name, undefined);

                // When extending the yup schema of an existing field (like in https://github.com/strapi/strapi/blob/293ff3b8f9559236609d123a2774e3be05ce8274/packages/strapi-plugin-i18n/admin/src/index.js#L52)
                // and triggering a yup validation error in the UI (missing a required field for example)
                // We got an object that looks like: formErrors = { "pluginOptions.i18n.localized": {...} }
                // In order to deal with this error, we can't rely on lodash.get to resolve this key
                // - lodash will try to access {pluginOptions: {i18n: {localized: true}}})
                // - and we just want to access { "pluginOptions.i18n.localized": {...} }
                // NOTE: this is a hack
                const pluginOptionError = Object.keys(formErrors).find((key) => key === input.name);

                // Retrieve the error for a specific input
                const errorId = pluginOptionError
                  ? formErrors[pluginOptionError].id
                  : get(
                      formErrors,
                      [
                        ...input.name
                          .split('.')
                          // The filter here is used when creating a component
                          // in the component step 1 modal
                          // Since the component info is stored in the
                          // componentToCreate object we can access the error
                          // By removing the key
                          .filter((key: string) => key !== 'componentToCreate'),
                        'id',
                      ],
                      null
                    );

                if (input.type === 'pushRight') {
                  return (
                    <Grid.Item
                      col={input.size || 6}
                      key={input.name || key}
                      direction="column"
                      alignItems="stretch"
                    >
                      <div />
                    </Grid.Item>
                  );
                }

                // Special handling for 'condition-form'
                if (input.type === 'condition-form') {
                  const currentCondition = get(modifiedData, input.name);

                  // Get all attributes from the content type schema
                  const contentTypeAttributes =
                    genericInputProps.contentTypeSchema?.attributes || [];

                  if (!genericInputProps.contentTypeSchema) {
                    console.warn('contentTypeSchema is undefined, skipping condition form');
                    return null;
                  }

                  // Filter for boolean and enumeration fields only
                  const availableFields = contentTypeAttributes
                    .filter((attr: any) => {
                      return attr.type === 'boolean' || attr.type === 'enumeration';
                    })
                    .map((attr: any) => ({
                      name: attr.name,
                      type: attr.type,
                      enum: attr.type === 'enumeration' ? attr.enum : undefined,
                    }));

                  const formatCondition = (condition: any) => {
                    if (!condition?.visible) {
                      return '';
                    }

                    const [[operator, conditions]] = Object.entries(condition.visible);
                    const [fieldVar, value] = conditions as [{ var: string }, any];

                    const dependsOnField = availableFields.find(
                      (field: { name: string }) => field.name === fieldVar.var
                    );
                    const dependsOnFieldName = dependsOnField ? dependsOnField.name : fieldVar.var;

                    const operatorText = operator === '==' ? 'is' : 'is not';
                    const valueText = String(value);
                    const actionText = operator === '==' ? 'Show' : 'Hide';
                    const attributeDisplayName =
                      genericInputProps.attributeName || modifiedData.name;

                    return `If ${dependsOnFieldName} ${operatorText} ${valueText}, then ${actionText} ${attributeDisplayName}`;
                  };

                  return (
                    <Grid.Item
                      col={input.size || 12}
                      key={input.name || key}
                      direction="column"
                      alignItems="stretch"
                    >
                      {!currentCondition || Object.keys(currentCondition).length === 0 ? (
                        <Box>
                          {currentCondition && Object.keys(currentCondition).length > 0 && (
                            <Typography variant="sigma" textColor="neutral800" marginBottom={2}>
                              {formatCondition(currentCondition)}
                            </Typography>
                          )}
                          <Button
                            marginTop={
                              currentCondition && Object.keys(currentCondition).length > 0 ? 0 : 4
                            }
                            fullWidth={true}
                            variant="secondary"
                            onClick={() => {
                              // This button should only appear if there's no condition
                              onChange({
                                target: {
                                  name: input.name,
                                  value: { visible: { '==': [{ var: '' }, ''] } },
                                },
                              });
                            }}
                            startIcon={<span aria-hidden>＋</span>}
                          >
                            {formatMessage({
                              id: 'form.attribute.condition.apply',
                              defaultMessage: 'Apply condition',
                            })}
                          </Button>
                        </Box>
                      ) : (
                        <GenericInput
                          {...input}
                          {...genericInputProps}
                          error={errorId}
                          onChange={onChange}
                          value={value}
                          autoFocus={i === 0}
                          attributeName={modifiedData.name}
                          conditionFields={availableFields}
                          onDelete={() => {
                            onChange({
                              target: {
                                name: input.name,
                              },
                            });
                          }}
                        />
                      )}
                    </Grid.Item>
                  );
                }

                // Default rendering for all other input types
                return (
                  <Grid.Item
                    col={input.size || 6}
                    key={input.name || key}
                    direction="column"
                    alignItems="stretch"
                  >
                    <GenericInput
                      {...input}
                      {...genericInputProps}
                      error={errorId}
                      onChange={onChange}
                      value={value}
                      autoFocus={i === 0}
                    />
                  </Grid.Item>
                );
              })}
            </Grid.Root>
          </Box>
        );
      })}
    </>
  );
};
