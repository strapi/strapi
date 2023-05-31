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
              {values.headers?.map((header, i) => (
                // eslint-disable-next-line
                <React.Fragment key={i}>
                  <GridItem col={6}>
                    <Field
                      as={Combobox}
                      name={`headers.${i}.key`}
                      aria-label={`row ${i + 1} key`}
                      label={formatMessage({
                        id: 'Settings.webhooks.key',
                        defaultMessage: 'Key',
                      })}
                      error={
                        errors.headers?.[i]?.key &&
                        formatMessage({
                          id: errors.headers[i]?.key,
                          defaultMessage: errors.headers[i]?.key,
                        })
                      }
                    />
                  </GridItem>
                  <GridItem col={6}>
                    <Flex alignItems="flex-end">
                      <Box style={{ flex: 1 }}>
                        <Field
                          as={TextInput}
                          aria-label={`row ${i + 1} value`}
                          label={formatMessage({
                            id: 'Settings.webhooks.value',
                            defaultMessage: 'Value',
                          })}
                          name={`headers.${i}.value`}
                          error={
                            errors.headers?.[i]?.value &&
                            formatMessage({
                              id: errors.headers[i]?.value,
                              defaultMessage: errors.headers[i]?.value,
                            })
                          }
                        />
                      </Box>
                      <Flex
                        paddingLeft={2}
                        style={{ alignSelf: 'center' }}
                        paddingTop={errors.headers?.[i]?.value ? 0 : 5}
                      >
                        <RemoveRoundedButton
                          onClick={() => values.headers.length !== 1 && remove(i)}
                          label={formatMessage(
                            {
                              id: 'Settings.webhooks.headers.remove',
                              defaultMessage: 'Remove header row {number}',
                            },
                            { number: i + 1 }
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
