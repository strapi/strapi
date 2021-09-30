import React from 'react';
import { RemoveRoundedButton } from '@strapi/helper-plugin';
import AddIcon from '@strapi/icons/AddIcon';
import { Box } from '@strapi/parts/Box';
import { FieldLabel } from '@strapi/parts/Field';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { TextInput } from '@strapi/parts/TextInput';
import { TextButton } from '@strapi/parts/TextButton';
import { Field, FieldArray, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

const HeadersInput = () => {
  const { formatMessage } = useIntl();
  const { values, errors } = useFormikContext();

  return (
    <Stack size={1}>
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
                      as={TextInput}
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
                    <Row>
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
                      <Box paddingLeft={2}>
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
                      </Box>
                    </Row>
                  </GridItem>
                </React.Fragment>
              ))}
              <GridItem col={12}>
                <TextButton
                  type="button"
                  onClick={() => {
                    push({ key: '', value: '' });
                  }}
                  startIcon={<AddIcon />}
                >
                  {formatMessage({
                    id: 'Settings.webhooks.create.header',
                    defaultMessage: 'Create a new header',
                  })}
                </TextButton>
              </GridItem>
            </Grid>
          )}
        />
      </Box>
    </Stack>
  );
};

export default HeadersInput;
