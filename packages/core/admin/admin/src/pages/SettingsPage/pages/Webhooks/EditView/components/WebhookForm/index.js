import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Link } from '@strapi/helper-plugin';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import Publish from '@strapi/icons/Play';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import { TextInput } from '@strapi/design-system/TextInput';
import { Grid, GridItem } from '@strapi/design-system/Grid';
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
              <Stack horizontal spacing={2}>
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
              </Stack>
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
            <Stack spacing={4}>
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
                <Stack spacing={6}>
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
                </Stack>
              </Box>
            </Stack>
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
