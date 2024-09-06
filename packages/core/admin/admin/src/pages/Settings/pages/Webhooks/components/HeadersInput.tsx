import * as React from 'react';

import {
  Box,
  Flex,
  Grid,
  TextButton,
  ComboboxOption,
  Combobox,
  ComboboxProps,
  IconButton,
  Field as DSField,
} from '@strapi/design-system';
import { Minus, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useField, useForm } from '../../../../../components/Form';
import { StringInput } from '../../../../../components/FormInputs/String';

const AddHeaderButton = styled(TextButton)`
  cursor: pointer;
`;

/* -------------------------------------------------------------------------------------------------
 * HeadersInput
 * -----------------------------------------------------------------------------------------------*/

interface Header {
  key: HTTPHeaders;
  value: string;
}

const HeadersInput = () => {
  const { formatMessage } = useIntl();

  const addFieldRow = useForm('HeadersInput', (state) => state.addFieldRow);
  const removeFieldRow = useForm('HeadersInput', (state) => state.removeFieldRow);
  const setFieldValue = useForm('HeadersInput', (state) => state.onChange);
  const { value = [] } = useField<Header[]>('headers');

  const removeRow = (index: number) => {
    // if we are removing the last row, simply clear it
    if (value.length === 1) {
      setFieldValue('headers', [{ key: '', value: '' }]);
    } else {
      removeFieldRow('headers', index);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <DSField.Label>
        {formatMessage({
          id: 'Settings.webhooks.form.headers',
          defaultMessage: 'Headers',
        })}
      </DSField.Label>
      <Box padding={8} background="neutral100" hasRadius>
        {value.map((val, index) => {
          return (
            <Grid.Root key={`${index}-${JSON.stringify(val.key)}`} gap={4} padding={2}>
              <Grid.Item col={6} direction="column" alignItems="stretch">
                <HeaderCombobox
                  name={`headers.${index}.key`}
                  aria-label={`row ${index + 1} key`}
                  label={formatMessage({
                    id: 'Settings.webhooks.key',
                    defaultMessage: 'Key',
                  })}
                />
              </Grid.Item>
              <Grid.Item col={6} direction="column" alignItems="stretch">
                <Flex alignItems="flex-end" gap={2}>
                  <Box style={{ flex: 1 }}>
                    <StringInput
                      name={`headers.${index}.value`}
                      aria-label={`row ${index + 1} value`}
                      label={formatMessage({
                        id: 'Settings.webhooks.value',
                        defaultMessage: 'Value',
                      })}
                      type="string"
                    />
                  </Box>
                  <IconButton
                    width="4rem"
                    height="4rem"
                    onClick={() => removeRow(index)}
                    color="primary600"
                    label={formatMessage(
                      {
                        id: 'Settings.webhooks.headers.remove',
                        defaultMessage: 'Remove header row {number}',
                      },
                      { number: index + 1 }
                    )}
                    type="button"
                  >
                    <Minus width="0.8rem" />
                  </IconButton>
                </Flex>
              </Grid.Item>
            </Grid.Root>
          );
        })}
        <Box paddingTop={4}>
          <AddHeaderButton
            type="button"
            onClick={() => {
              addFieldRow('headers', { key: '', value: '' });
            }}
            startIcon={<Plus />}
          >
            {formatMessage({
              id: 'Settings.webhooks.create.header',
              defaultMessage: 'Create new header',
            })}
          </AddHeaderButton>
        </Box>
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderCombobox
 * -----------------------------------------------------------------------------------------------*/

interface HeaderComboboxProps extends Omit<ComboboxProps, 'children' | 'name'> {
  name: string;
  label: string;
}

const HeaderCombobox = ({ name, label, ...restProps }: HeaderComboboxProps) => {
  const [options, setOptions] = React.useState<HTTPHeaders[]>([...HTTP_HEADERS]);
  const { value: headers } = useField<Header[]>('headers');
  const field = useField(name);

  React.useEffect(() => {
    const headerOptions = HTTP_HEADERS.filter(
      (key) => !headers?.some((header) => header.key !== field.value && header.key === key)
    );

    setOptions(headerOptions);
  }, [headers, field.value]);

  const handleChange: ComboboxProps['onChange'] = (value) => {
    field.onChange(name, value);
  };

  const handleCreateOption = (value: string) => {
    setOptions((prev) => [...prev, value as HTTPHeaders]);

    handleChange(value);
  };

  return (
    <DSField.Root name={name} error={field.error}>
      <DSField.Label>{label}</DSField.Label>
      <Combobox
        {...restProps}
        onClear={() => handleChange('')}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        placeholder=""
        creatable
        value={field.value}
      >
        {options.map((key) => (
          <ComboboxOption value={key} key={key}>
            {key}
          </ComboboxOption>
        ))}
      </Combobox>
      <DSField.Error />
    </DSField.Root>
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
