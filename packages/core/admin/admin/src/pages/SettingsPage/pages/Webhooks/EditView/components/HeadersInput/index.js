import React from 'react';
import { RemoveRoundedButton } from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import {
  Box,
  FieldLabel,
  Grid,
  GridItem,
  Flex,
  TextInput,
  TextButton,
} from '@strapi/design-system';
import { Field, FieldArray, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import Combobox from './Combobox';

const HeadersInput = () => {
  const { formatMessage } = useIntl();
  const { values, errors } = useFormikContext();

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <FieldLabel>
        {formatMessage({
          id: 'Settings.webhooks.form.headers',
          defaultMessage: 'Headers',
        })}
      </FieldLabel>
      <Box padding={8} background="neutral100" hasRadius>
        <FieldArray
          validateOnChange={false}
          name="headers"
          render={({ push, remove }) => (
            <Grid gap={4}>
              {values.headers?.map((header, index) => (
                <React.Fragment key={`header-${header.key}`}>
                  <GridItem col={6}>
                    <Field
                      as={Combobox}
                      name={`headers.${index}.key`}
                      aria-label={`row ${index + 1} key`}
                      label={formatMessage({
                        id: 'Settings.webhooks.key',
                        defaultMessage: 'Key',
                      })}
                      error={
                        errors.headers?.[index]?.key &&
                        formatMessage({
                          id: errors.headers[index]?.key,
                          defaultMessage: errors.headers[index]?.key,
                        })
                      }
                    />
                  </GridItem>
                  <GridItem col={6}>
                    <Flex alignItems="flex-end">
                      <Box style={{ flex: 1 }}>
                        <Field
                          as={TextInput}
                          name={`headers.${index}.value`}
                          aria-label={`row ${index + 1} value`}
                          label={formatMessage({
                            id: 'Settings.webhooks.value',
                            defaultMessage: 'Value',
                          })}
                          error={
                            errors.headers?.[index]?.value &&
                            formatMessage({
                              id: errors.headers[index]?.value,
                              defaultMessage: errors.headers[index]?.value,
                            })
                          }
                        />
                      </Box>
                      <Flex
                        paddingLeft={2}
                        style={{ alignSelf: 'center' }}
                        paddingTop={errors.headers?.[index]?.value ? 0 : 5}
                      >
                        <RemoveRoundedButton
                          onClick={() => values.headers.length !== 1 && remove(index)}
                          label={formatMessage(
                            {
                              id: 'Settings.webhooks.headers.remove',
                              defaultMessage: 'Remove header row {number}',
                            },
                            { number: index + 1 }
                          )}
                        />
                      </Flex>
                    </Flex>
                  </GridItem>
                </React.Fragment>
              ))}
              <GridItem col={12}>
                <TextButton
                  type="button"
                  onClick={() => {
                    push({ key: '', value: '' });
                  }}
                  startIcon={<Plus />}
                >
                  {formatMessage({
                    id: 'Settings.webhooks.create.header',
                    defaultMessage: 'Create new header',
                  })}
                </TextButton>
              </GridItem>
            </Grid>
          )}
        />
      </Box>
    </Flex>
  );
};

export default HeadersInput;
