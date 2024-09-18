import * as React from 'react';

import { Box, Button, Flex, Grid, TextInput } from '@strapi/design-system';
import { Check, Play as Publish } from '@strapi/icons';
import { IntlShape, useIntl } from 'react-intl';
import * as yup from 'yup';

import { TriggerWebhook } from '../../../../../../../shared/contracts/webhooks';
import { Form, FormHelpers } from '../../../../../components/Form';
import { InputRenderer } from '../../../../../components/FormInputs/Renderer';
import { Layouts } from '../../../../../components/Layouts/Layout';
import { BackButton } from '../../../../../features/BackButton';
import { useEnterprise } from '../../../../../hooks/useEnterprise';

import { EventTableCE } from './EventsTable';
import { HeadersInput } from './HeadersInput';
import { TriggerContainer } from './TriggerContainer';

import type { Modules } from '@strapi/types';

interface WebhookFormValues {
  name: Modules.WebhookStore.Webhook['name'];
  url: Modules.WebhookStore.Webhook['url'];
  headers: Array<{ key: string; value: string }>;
  events: Modules.WebhookStore.Webhook['events'];
}

interface WebhookFormProps {
  data?: Modules.WebhookStore.Webhook;
  handleSubmit: (
    values: WebhookFormValues,
    helpers: FormHelpers<WebhookFormValues>
  ) => Promise<void>;
  isCreating: boolean;
  isTriggering: boolean;
  triggerWebhook: () => void;
  triggerResponse?: TriggerWebhook.Response['data'];
}

const WebhookForm = ({
  handleSubmit,
  triggerWebhook,
  isCreating,
  isTriggering,
  triggerResponse,
  data,
}: WebhookFormProps) => {
  const { formatMessage } = useIntl();
  const [showTriggerResponse, setShowTriggerResponse] = React.useState(false);
  const EventTable = useEnterprise(
    EventTableCE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/src/pages/SettingsPage/pages/Webhooks/components/EventsTable'
        )
      ).EventsTableEE
  );

  /**
   * Map the headers into a form that can be used within the formik form
   */
  const mapHeaders = (headers: Modules.WebhookStore.Webhook['headers']) => {
    if (!Object.keys(headers).length) {
      return [{ key: '', value: '' }];
    }

    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  };

  // block rendering until the EE component is fully loaded
  if (!EventTable) {
    return null;
  }

  return (
    <Form
      initialValues={{
        name: data?.name || '',
        url: data?.url || '',
        headers: mapHeaders(data?.headers || {}),
        events: data?.events || [],
      }}
      method={isCreating ? 'POST' : 'PUT'}
      onSubmit={handleSubmit}
      validationSchema={makeWebhookValidationSchema({ formatMessage })}
    >
      {({ isSubmitting, modified }) => (
        <>
          <Layouts.Header
            primaryAction={
              <Flex gap={2}>
                <Button
                  onClick={() => {
                    triggerWebhook();
                    setShowTriggerResponse(true);
                  }}
                  variant="tertiary"
                  startIcon={<Publish />}
                  disabled={isCreating || isTriggering}
                  size="L"
                >
                  {formatMessage({
                    id: 'Settings.webhooks.trigger',
                    defaultMessage: 'Trigger',
                  })}
                </Button>
                <Button
                  startIcon={<Check />}
                  type="submit"
                  size="L"
                  disabled={!modified}
                  loading={isSubmitting}
                >
                  {formatMessage({
                    id: 'global.save',
                    defaultMessage: 'Save',
                  })}
                </Button>
              </Flex>
            }
            title={
              isCreating
                ? formatMessage({
                    id: 'Settings.webhooks.create',
                    defaultMessage: 'Create a webhook',
                  })
                : data?.name
            }
            navigationAction={<BackButton />}
          />
          <Layouts.Content>
            <Flex direction="column" alignItems="stretch" gap={4}>
              {showTriggerResponse && (
                <TriggerContainer
                  isPending={isTriggering}
                  response={triggerResponse}
                  onCancel={() => setShowTriggerResponse(false)}
                />
              )}
              <Box background="neutral0" padding={8} shadow="filterShadow" hasRadius>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <Grid.Root gap={6}>
                    {[
                      {
                        label: formatMessage({
                          id: 'global.name',
                          defaultMessage: 'Name',
                        }),
                        name: 'name',
                        required: true,
                        size: 6,
                        type: 'string' as const,
                      },
                      {
                        label: formatMessage({
                          id: 'Settings.roles.form.input.url',
                          defaultMessage: 'Url',
                        }),
                        name: 'url',
                        required: true,
                        size: 12,
                        type: 'string' as const,
                      },
                    ].map(({ size, ...field }) => (
                      <Grid.Item
                        key={field.name}
                        col={size}
                        direction="column"
                        alignItems="stretch"
                      >
                        <InputRenderer {...field} />
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                  <HeadersInput />
                  <EventTable />
                </Flex>
              </Box>
            </Flex>
          </Layouts.Content>
        </>
      )}
    </Form>
  );
};

const NAME_REGEX = /(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)/;
const URL_REGEX = /(^$)|((https?:\/\/.*)(d*)\/?(.*))/;

const makeWebhookValidationSchema = ({ formatMessage }: Pick<IntlShape, 'formatMessage'>) =>
  yup.object().shape({
    name: yup
      .string()
      .nullable()
      .required(
        formatMessage({
          id: 'Settings.webhooks.validation.name.required',
          defaultMessage: 'Name is required',
        })
      )
      .matches(
        NAME_REGEX,
        formatMessage({
          id: 'Settings.webhooks.validation.name.regex',
          defaultMessage:
            'The name must start with a letter and only contain letters, numbers, spaces and underscores',
        })
      ),
    url: yup
      .string()
      .nullable()
      .required(
        formatMessage({
          id: 'Settings.webhooks.validation.url.required',
          defaultMessage: 'Url is required',
        })
      )
      .matches(
        URL_REGEX,
        formatMessage({
          id: 'Settings.webhooks.validation.url.regex',
          defaultMessage: 'The value must be a valid Url',
        })
      ),
    headers: yup.lazy((array) => {
      const baseSchema = yup.array();

      if (array.length === 1) {
        const { key, value } = array[0];

        if (!key && !value) {
          return baseSchema;
        }
      }

      return baseSchema.of(
        yup.object().shape({
          key: yup
            .string()
            .required(
              formatMessage({
                id: 'Settings.webhooks.validation.key',
                defaultMessage: 'Key is required',
              })
            )
            .nullable(),
          value: yup
            .string()
            .required(
              formatMessage({
                id: 'Settings.webhooks.validation.value',
                defaultMessage: 'Value is required',
              })
            )
            .nullable(),
        })
      );
    }),
    events: yup.array(),
  });

export { WebhookForm };
export type { WebhookFormValues, WebhookFormProps };
