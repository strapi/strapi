import {
  Field,
  Flex,
  Grid,
  JSONInput,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useField } from '../../../../../components/Form';

import type { Modules } from '@strapi/types';

type BodyMode = Modules.WebhookStore.BodyMode;

/* -------------------------------------------------------------------------------------------------
 * BodyInput
 * -----------------------------------------------------------------------------------------------*/

/**
 * Edits the body template of a webhook as JSON text, and whether it is added to the default
 * payload or replaces it. An empty text means the default payload, so the mode is then hidden.
 */
const BodyInput = () => {
  const { formatMessage } = useIntl();
  const body = useField<string>('body');
  const bodyMode = useField<BodyMode>('bodyMode');
  const value = body.value ?? '';
  const isEmpty = value.trim() === '';

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Field.Root
        name="body"
        error={body.error}
        hint={formatMessage(
          {
            id: 'Settings.webhooks.body.hint',
            defaultMessage:
              'Leave empty to send the default payload. Insert event data with {placeholder}.',
          },
          // Passed as a value: the braces of a placeholder are ICU syntax in a message
          { placeholder: '{{ entry.title }}' }
        )}
      >
        <Field.Label>
          {formatMessage({
            id: 'Settings.webhooks.form.body',
            defaultMessage: 'Request body',
          })}
        </Field.Label>
        <JSONInput
          value={value}
          onChange={(json) => body.onChange('body', json)}
          minHeight="16rem"
          maxHeight="40rem"
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
      {!isEmpty && (
        <Grid.Root gap={6}>
          <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="bodyMode" error={bodyMode.error}>
              <Field.Label>
                {formatMessage({
                  id: 'Settings.webhooks.body.mode',
                  defaultMessage: 'Default payload',
                })}
              </Field.Label>
              <SingleSelect
                value={bodyMode.value ?? 'merge'}
                onChange={(mode) => bodyMode.onChange('bodyMode', mode as BodyMode)}
              >
                <SingleSelectOption value="merge">
                  {formatMessage({
                    id: 'Settings.webhooks.body.mode.merge',
                    defaultMessage: 'Add the request body to it',
                  })}
                </SingleSelectOption>
                <SingleSelectOption value="replace">
                  {formatMessage({
                    id: 'Settings.webhooks.body.mode.replace',
                    defaultMessage: 'Replace it with the request body',
                  })}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Error />
            </Field.Root>
          </Grid.Item>
        </Grid.Root>
      )}
    </Flex>
  );
};

export { BodyInput };
