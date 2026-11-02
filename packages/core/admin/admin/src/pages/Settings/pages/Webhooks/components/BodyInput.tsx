import { Field, JSONInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useField } from '../../../../../components/Form';

const BODY_TEMPLATE_FUTURE_FLAG = 'unstableWebhookBodyTemplate';

const isBodyTemplateEnabled = () =>
  window.strapi.future.isEnabled(BODY_TEMPLATE_FUTURE_FLAG) === true;

/* -------------------------------------------------------------------------------------------------
 * BodyInput
 * -----------------------------------------------------------------------------------------------*/

/**
 * Edits the body template of a webhook as JSON text. An empty text means the default payload.
 */
const BodyInput = () => {
  const { formatMessage } = useIntl();
  const body = useField<string>('body');

  return (
    <Field.Root
      name="body"
      error={body.error}
      hint={formatMessage(
        {
          id: 'Settings.webhooks.body.hint',
          defaultMessage:
            'Sent in place of the default payload, leave empty to keep it. Available variables: {eventVariables}. For entry events: {entryVariables}, and {entryField} when the events are selected per content type.',
        },
        // Passed as values: the braces of a placeholder are ICU syntax in a message
        {
          eventVariables: '{{ event }}, {{ createdAt }}',
          entryVariables: '{{ model }}, {{ uid }}, {{ documentId }}, {{ entry }}',
          entryField: '{{ entry.title }}',
        }
      )}
    >
      <Field.Label>
        {formatMessage({
          id: 'Settings.webhooks.form.body',
          defaultMessage: 'Request body',
        })}
      </Field.Label>
      <JSONInput
        value={body.value ?? ''}
        onChange={(json) => body.onChange('body', json)}
        minHeight="16rem"
        maxHeight="40rem"
      />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export { BodyInput, isBodyTemplateEnabled };
