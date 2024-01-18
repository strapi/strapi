import * as React from 'react';

import {
  Box,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  TextButton,
  TextInput,
  ComboboxOption,
  CreatableCombobox,
  ComboboxProps,
} from '@strapi/design-system';
import { RemoveRoundedButton } from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { Field, FieldArray, FieldInputProps, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * HeadersInput
 * -----------------------------------------------------------------------------------------------*/

interface FormikContext {
  headers: Array<{ key: HTTPHeaders; value: string }>;
}

const HeadersInput = () => {
  const { formatMessage } = useIntl();
  const { values, errors } = useFormikContext<FormikContext>();

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
              {values.headers.map((header, index) => {
                const formikError = errors.headers?.[index];

                const comboboxError = typeof formikError === 'object' ? formikError.key : undefined;
                const textInputError =
                  typeof formikError === 'object' ? formikError.value : undefined;

                return (
                  <React.Fragment key={`${index}.${header.key}`}>
                    <GridItem col={6}>
                      <Field
                        as={HeaderCombobox}
                        name={`headers.${index}.key`}
                        aria-label={`row ${index + 1} key`}
                        label={formatMessage({
                          id: 'Settings.webhooks.key',
                          defaultMessage: 'Key',
                        })}
                        error={comboboxError}
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
                            error={textInputError}
                          />
                        </Box>
                        <Flex
                          paddingLeft={2}
                          style={{ alignSelf: 'center' }}
                          paddingTop={textInputError ? 0 : 5}
                        >
                          <RemoveRoundedButton
                            disabled={values.headers.length === 1}
                            onClick={() => remove(index)}
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
                );
              })}
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

/* -------------------------------------------------------------------------------------------------
 * HeaderCombobox
 * -----------------------------------------------------------------------------------------------*/

interface HeaderComboboxProps
  extends FieldInputProps<string>,
    Required<Pick<ComboboxProps, 'label' | 'error'>> {}

const HeaderCombobox = ({ name, onChange, value, ...restProps }: HeaderComboboxProps) => {
  const {
    values: { headers },
  } = useFormikContext<FormikContext>();
  const [options, setOptions] = React.useState<HTTPHeaders[]>([...HTTP_HEADERS]);

  React.useEffect(() => {
    const headerOptions = HTTP_HEADERS.filter(
      (key) => !headers?.some((header) => header.key !== value && header.key === key)
    );

    setOptions(headerOptions);
  }, [headers, value]);

  const handleChange: ComboboxProps['onChange'] = (value) => {
    onChange({ target: { name, value } });
  };

  const handleCreateOption = (value: string) => {
    setOptions((prev) => [...prev, value as HTTPHeaders]);

    handleChange(value);
  };

  return (
    <CreatableCombobox
      {...restProps}
      onClear={() => handleChange('')}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      placeholder=""
      value={value}
    >
      {options.map((key) => (
        <ComboboxOption value={key} key={key}>
          {key}
        </ComboboxOption>
      ))}
    </CreatableCombobox>
  );
};

const HTTP_HEADERS = [
  'A-IM',
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Accept-Datetime',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Max-Forwards',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'TE',
  'User-Agent',
  'Upgrade',
  'Via',
  'Warning',
] as const;

type HTTPHeaders = (typeof HTTP_HEADERS)[number];

export { HeadersInput };
