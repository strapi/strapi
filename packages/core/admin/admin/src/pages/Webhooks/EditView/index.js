/**
 *
 * EditView
 *
 */

import {
  Form,
  request,
  useNotification,
  useOverlayBlocker,
  SettingsPageTitle,
} from '@strapi/helper-plugin';
import { AddIcon, Autoselect, BackIcon, CheckIcon, Publish } from '@strapi/icons';
import {
  Box,
  Button,
  ContentLayout,
  FieldLabel,
  Grid,
  GridItem,
  HeaderLayout,
  IconButton,
  Link,
  Main,
  P,
  Row,
  Stack,
  TextInput,
} from '@strapi/parts';
import { TextButton } from '@strapi/parts/TextButton';
import { Field, FieldArray, Formik } from 'formik';
import React from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useHistory, useRouteMatch } from 'react-router-dom';
import EventInput from '../../../components/Webhooks/EventInput';
import { cleanData, schema } from './utils';

const EditView = () => {
  const {
    params: { id },
  } = useRouteMatch('/settings/webhooks/:id');
  const { formatMessage } = useIntl();
  const { replace } = useHistory();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();

  const isCreating = id === 'create';

  const createWebhookMutation = useMutation(body =>
    request('/admin/webhooks', {
      method: 'POST',
      body,
    })
  );

  const handleSubmit = async data => {
    if (isCreating) {
      lockApp();
      console.log(data);
      createWebhookMutation.mutate(cleanData(data), {
        onSuccess: () => {
          toggleNotification({
            type: 'success',
            message: { id: 'Settings.webhooks.created' },
          });
          replace(`/settings/webhooks/${data.id}`);
          unlockApp();
        },
        onError: e => {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
          console.log(e);
          unlockApp();
        },
      });
    }
  };

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Webhooks" />
      <Formik
        onSubmit={handleSubmit}
        initialValues={{
          name: '',
          url: '',
          headers: [{ key: '', value: '' }],
          events: [],
        }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({ handleSubmit, values, errors, handleReset, handleChange }) => (
          <Form noValidate>
            <HeaderLayout
              id="title"
              primaryAction={
                <Stack horizontal size={2}>
                  <Button onClick={() => {}} variant="tertiary" startIcon={<Publish />}>
                    {formatMessage({
                      id: 'Settings.webhooks.trigger',
                      defaultMessage: 'Trigger',
                    })}
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    {formatMessage({
                      id: 'app.components.Button.reset',
                      defaultMessage: 'Reset',
                    })}
                  </Button>
                  <Button startIcon={<CheckIcon />} onClick={handleSubmit}>
                    {formatMessage({
                      id: 'app.components.Button.save',
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
                  : 'changeme'
              }
              navigationAction={
                <Link startIcon={<BackIcon />} to="/settings/webhooks">
                  Go back
                </Link>
              }
              as="h1"
            />
            <ContentLayout>
              <Box background="neutral0" padding={8} shadow="filterShadow" hasRadius>
                <Stack size={6}>
                  <Grid gap={6}>
                    <GridItem col={6}>
                      <Field
                        as={TextInput}
                        name="name"
                        error={errors.name && formatMessage({ id: errors.name })}
                        label={formatMessage({
                          id: 'Settings.webhooks.form.name',
                          defaultMessage: 'Name',
                        })}
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
                      />
                    </GridItem>
                  </Grid>
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
                            <GridItem col={6}>
                              <FieldLabel>
                                {formatMessage({
                                  id: 'Settings.webhooks.key',
                                  defaultMessage: 'Key',
                                })}
                              </FieldLabel>
                            </GridItem>
                            <GridItem col={6}>
                              <FieldLabel>
                                {formatMessage({
                                  id: 'Settings.webhooks.value',
                                  defaultMessage: 'Value',
                                })}
                              </FieldLabel>
                            </GridItem>
                            {values.headers?.map((header, i) => (
                              // eslint-disable-next-line
                              <React.Fragment key={i}>
                                <GridItem col={6}>
                                  <Field
                                    as={TextInput}
                                    name={`headers.${i}.key`}
                                    error={
                                      errors.headers?.[i]?.key &&
                                      formatMessage({ id: errors.headers[i]?.key })
                                    }
                                  />
                                </GridItem>
                                <GridItem col={6}>
                                  <Row>
                                    <Box style={{ flex: 1 }}>
                                      <Field
                                        as={TextInput}
                                        name={`headers.${i}.value`}
                                        error={
                                          errors.headers?.[i]?.value &&
                                          formatMessage({ id: errors.headers[i]?.value })
                                        }
                                      />
                                    </Box>
                                    <Box paddingLeft={2}>
                                      <IconButton
                                        onClick={() => values.headers.length !== 1 && remove(i)}
                                        label={formatMessage({
                                          id: 'Settings.webhooks.events.update',
                                        })}
                                        icon={<Autoselect />}
                                        noBorder
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
                  <Stack size={1}>
                    <FieldLabel>
                      {formatMessage({
                        id: 'Settings.webhooks.form.events',
                        defaultMessage: 'Events',
                      })}
                    </FieldLabel>
                    <EventInput
                      name="events"
                      onChange={handleChange}
                      isDraftAndPublish={false}
                      value={values.events}
                    />
                    {errors.events && (
                      <P small textColor="danger600" data-strapi-field-error>
                        {formatMessage({
                          id: 'components.Input.error.validation.required',
                          defaultMessage: 'This value is required',
                        })}
                      </P>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </ContentLayout>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export default EditView;
