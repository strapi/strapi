import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Link } from '@strapi/helper-plugin';
import { ArrowLeft, Check, Play as Publish } from '@strapi/icons';
import {
  ContentLayout,
  HeaderLayout,
  Box,
  Button,
  Flex,
  TextInput,
  Grid,
  GridItem,
} from '@strapi/design-system';
import { Field, Formik } from 'formik';

import { useIntl } from 'react-intl';
import EventInput from '../EventInput';
import HeadersInput from '../HeadersInput';
import TriggerContainer from '../TriggerContainer';
import schema from '../utils/schema';

const WebhookForm = ({
  handleSubmit,
  data,
  triggerWebhook,
  isCreating,
  isTriggering,
  triggerResponse,
  isDraftAndPublishEvents,
}) => {
  const { formatMessage } = useIntl();
  const [showTriggerResponse, setShowTriggerResponse] = useState(false);

  return (
    <Formik
      onSubmit={handleSubmit}
      initialValues={{
        name: data?.name || '',
        url: data?.url || '',
        headers: Object.keys(data?.headers || []).length
          ? Object.entries(data.headers).map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }],
        events: data?.events || [],
      }}
      validationSchema={schema}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ handleSubmit, errors }) => (
        <Form noValidate>
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
                <Button startIcon={<Check />} onClick={handleSubmit} type="submit" size="L">
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
                <div className="trigger-wrapper">
                  <TriggerContainer
                    isPending={isTriggering}
                    response={triggerResponse}
                    onCancel={() => setShowTriggerResponse(false)}
                  />
                </div>
              )}
              <Box background="neutral0" padding={8} shadow="filterShadow" hasRadius>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <Grid gap={6}>
                    <GridItem col={6}>
                      <Field
                        as={TextInput}
                        name="name"
                        error={errors.name && formatMessage({ id: errors.name })}
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
                        error={errors.url && formatMessage({ id: errors.url })}
                        label={formatMessage({
                          id: 'Settings.roles.form.input.url',
                          defaultMessage: 'Url',
                        })}
                        required
                      />
                    </GridItem>
                  </Grid>
                  <HeadersInput />
                  <EventInput isDraftAndPublish={isDraftAndPublishEvents} />
                </Flex>
              </Box>
            </Flex>
          </ContentLayout>
        </Form>
      )}
    </Formik>
  );
};

WebhookForm.propTypes = {
  data: PropTypes.object,
  handleSubmit: PropTypes.func.isRequired,
  triggerWebhook: PropTypes.func.isRequired,
  isCreating: PropTypes.bool.isRequired,
  isDraftAndPublishEvents: PropTypes.bool.isRequired,
  isTriggering: PropTypes.bool.isRequired,
  triggerResponse: PropTypes.object,
};

WebhookForm.defaultProps = {
  data: undefined,
  triggerResponse: undefined,
};

export default WebhookForm;
