import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  TextInput,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { Form } from '@strapi/helper-plugin';
import { ArrowLeft, Check, Play as Publish } from '@strapi/icons';
import { Webhook } from '@strapi/types';
import { Field, FormikHelpers, FormikProvider, useFormik } from 'formik';
import { IntlShape, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import * as yup from 'yup';

import { TriggerWebhook } from '../../../../../../../shared/contracts/webhooks';
import { useEnterprise } from '../../../../../hooks/useEnterprise';

import { EventTableCE } from './EventsTable';
import { HeadersInput } from './HeadersInput';
import { TriggerContainer } from './TriggerContainer';

interface WebhookFormValues {
  name: Webhook['name'];
  url: Webhook['url'];
  headers: Array<{ key: string; value: string }>;
  events: Webhook['events'];
}

interface WebhookFormProps {
  data?: Webhook;
  handleSubmit: (
    values: WebhookFormValues,
    formik: FormikHelpers<WebhookFormValues>
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
  const mapHeaders = (headers: Webhook['headers']) => {
    if (!Object.keys(headers).length) {
      return [{ key: '', value: '' }];
    }

    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  };

  const formik = useFormik({
    initialValues: {
      name: data?.name || '',
      url: data?.url || '',
      headers: mapHeaders(data?.headers || {}),
      events: data?.events || [],
    },
    async onSubmit(values, formik) {
      await handleSubmit(values, formik);

      formik.resetForm({ values });
    },
    validationSchema: makeWebhookValidationSchema({ formatMessage }),
    validateOnChange: false,
    validateOnBlur: false,
  });

  // block rendering until the EE component is fully loaded
  if (!EventTable) {
    return null;
  }

  return (
    <FormikProvider value={formik}>
      <Form>
        <HeaderLayout
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
                disabled={!formik.dirty}
                loading={formik.isSubmitting}
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
          navigationAction={
            // @ts-expect-error – as components props are not inferred correctly.
            <Link as={NavLink} startIcon={<ArrowLeft />} to="/settings/webhooks">
              {formatMessage({
                id: 'global.back',
                defaultMessage: 'Back',
              })}
            </Link>
          }
        />
        <ContentLayout>
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
                <Grid gap={6}>
                  <GridItem col={6}>
                    <Field
                      as={TextInput}
                      name="name"
                      error={formik.errors.name}
                      label={formatMessage({
                        id: 'global.name',
                        defaultMessage: 'Name',
                      })}
                      required
                    />
                  </GridItem>
                  <GridItem col={12}>
                    <Field
                      as={TextInput}
                      name="url"
                      error={formik.errors.url}
                      label={formatMessage({
                        id: 'Settings.roles.form.input.url',
                        defaultMessage: 'Url',
                      })}
                      required
                    />
                  </GridItem>
                </Grid>
                <HeadersInput />
                <EventTable />
              </Flex>
            </Box>
          </Flex>
        </ContentLayout>
      </Form>
    </FormikProvider>
  );
};

const NAME_REGEX = /(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)/;
const URL_REGEX = /(^$)|((https?:\/\/.*)(d*)\/?(.*))/;

const makeWebhookValidationSchema = ({ formatMessage }: Pick<IntlShape, 'formatMessage'>) =>
  yup.object().shape({
    name: yup
      .string()
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
          key: yup.string().required(
            formatMessage({
              id: 'Settings.webhooks.validation.key',
              defaultMessage: 'Key is required',
            })
          ),
          value: yup.string().required(
            formatMessage({
              id: 'Settings.webhooks.validation.value',
              defaultMessage: 'Value is required',
            })
          ),
        })
      );
    }),
    events: yup.array(),
  });

export { WebhookForm };
export type { WebhookFormValues, WebhookFormProps };
