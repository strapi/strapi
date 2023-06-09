import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Field, FormikProvider, useFormik } from 'formik';
import { useIntl } from 'react-intl';
import { Form, Link } from '@strapi/helper-plugin';
import { ArrowLeft, Check, Play as Publish } from '@strapi/icons';
import {
  Grid,
  GridItem,
  Button,
  Flex,
  TextInput,
  HeaderLayout,
  ContentLayout,
  Box,
} from '@strapi/design-system';

import EventTable from 'ee_else_ce/pages/SettingsPage/pages/Webhooks/EditView/components/EventTable';
import { makeWebhookValidationSchema } from './utils/makeWebhookValidationSchema';
import HeadersInput from '../HeadersInput';
import TriggerContainer from '../TriggerContainer';

const WebhookForm = ({
  handleSubmit,
  triggerWebhook,
  isCreating,
  isTriggering,
  triggerResponse,
  data,
}) => {
  const { formatMessage } = useIntl();
  const [showTriggerResponse, setShowTriggerResponse] = useState(false);

  /**
   * Map the headers into a form that can be used within the formik form
   * @param {Object} headers
   * @returns {Array}
   */
  const mapHeaders = (headers) => {
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
    onSubmit: handleSubmit,
    validationSchema: makeWebhookValidationSchema({ formatMessage }),
    validateOnChange: false,
    validateOnBlur: false,
  });

  return (
    <FormikProvider value={formik}>
      <Form onSubmit={formik.handleSubmit}>
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
            <Link startIcon={<ArrowLeft />} to="/settings/webhooks">
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
                      error={formik?.errors?.name && formik.errors.name}
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
                      error={formik?.errors?.url && formik.errors.url}
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

WebhookForm.propTypes = {
  data: PropTypes.object,
  handleSubmit: PropTypes.func.isRequired,
  triggerWebhook: PropTypes.func.isRequired,
  isCreating: PropTypes.bool.isRequired,
  isTriggering: PropTypes.bool.isRequired,
  triggerResponse: PropTypes.object,
};

WebhookForm.defaultProps = {
  data: undefined,
  triggerResponse: undefined,
};

export default WebhookForm;
