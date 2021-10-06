import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import { CheckPermissions, Form, LoadingIndicatorPage } from '@strapi/helper-plugin';

// Strapi Parts
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { H3 } from '@strapi/parts/Text';
import { ToggleInput } from '@strapi/parts/ToggleInput';
import { TextInput } from '@strapi/parts/TextInput';
import { Grid, GridItem } from '@strapi/parts/Grid';

// Strapi Icons
import Show from '@strapi/icons/Show';
import Hide from '@strapi/icons/Hide';
import Check from '@strapi/icons/Check';

import permissions from '../../permissions';
import { getTrad } from '../../utils';
import useReactQuery from '../utils/useReactQuery';
import FieldActionWrapper from '../../components/FieldActionWrapper';
import schema from '../utils/schema';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { submitMutation, data, isLoading } = useReactQuery();
  const [passwordShown, setPasswordShown] = useState(false);

  const handleUpdateSettingsSubmit = body => {
    submitMutation.mutate({
      prefix: data?.prefix,
      body,
    });
  };

  return (
    <Main>
      {isLoading ? (
        <LoadingIndicatorPage>Plugin settings are loading</LoadingIndicatorPage>
      ) : (
        <Formik
          initialValues={{
            restrictedAccess: data?.documentationAccess.restrictedAccess || false,
            password: data?.documentationAccess.password,
          }}
          onSubmit={handleUpdateSettingsSubmit}
          validationSchema={schema}
        >
          {({ handleSubmit, values, handleChange, errors }) => {
            return (
              <Form noValidate onSubmit={handleSubmit}>
                <HeaderLayout
                  title={formatMessage({
                    id: getTrad('plugin.name'),
                    defaultMessage: 'Documentation',
                  })}
                  subtitle={formatMessage({
                    id: getTrad('pages.SettingsPage.header.description'),
                    defaultMessage: 'Configure the documentation plugin',
                  })}
                  primaryAction={
                    //  eslint-disable-next-line
                    <CheckPermissions permissions={permissions.update}>
                      <Button type="submit" startIcon={<Check />}>
                        {formatMessage({
                          id: getTrad('pages.SettingsPage.Button.save'),
                          defaultMessage: 'Save',
                        })}
                      </Button>
                    </CheckPermissions>
                  }
                />
                <ContentLayout>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack size={4}>
                      <H3 as="h2">
                        {formatMessage({
                          id: getTrad('pages.SettingsPage.title'),
                          defaultMessage: 'Settings',
                        })}
                      </H3>
                      <Grid gap={4}>
                        <GridItem col={6} s={12}>
                          <ToggleInput
                            name="restrictedAccess"
                            label={formatMessage({
                              id: getTrad('pages.SettingsPage.toggle.label'),
                              defaultMessage: 'Restricted Access',
                            })}
                            hint={formatMessage({
                              id: getTrad('pages.SettingsPage.toggle.hint'),
                              defaultMessage: 'Make the documentation endpoint private',
                            })}
                            checked={values.restrictedAccess}
                            onChange={handleChange}
                            onLabel="On"
                            offLabel="Off"
                          />
                        </GridItem>
                        {values.restrictedAccess && (
                          <GridItem col={6} s={12}>
                            <TextInput
                              label={formatMessage({
                                id: getTrad('pages.SettingsPage.password.label'),
                                defaultMessage: 'Password',
                              })}
                              name="password"
                              type={passwordShown ? 'text' : 'password'}
                              value={values.password}
                              onChange={handleChange}
                              error={
                                errors.password
                                  ? formatMessage({
                                      id: errors.password,
                                      defaultMessage: 'Invalid value',
                                    })
                                  : null
                              }
                              endAction={
                                // eslint-disable-next-line
                                <FieldActionWrapper
                                  onClick={e => {
                                    e.stopPropagation();
                                    setPasswordShown(prev => !prev);
                                  }}
                                  label={formatMessage(
                                    passwordShown
                                      ? {
                                          id: 'Auth.form.password.show-password',
                                          defaultMessage: 'Show password',
                                        }
                                      : {
                                          id: 'Auth.form.password.hide-password',
                                          defaultMessage: 'Hide password',
                                        }
                                  )}
                                >
                                  {passwordShown ? <Show /> : <Hide />}
                                </FieldActionWrapper>
                              }
                            />
                          </GridItem>
                        )}
                      </Grid>
                    </Stack>
                  </Box>
                </ContentLayout>
              </Form>
            );
          }}
        </Formik>
      )}
    </Main>
  );
};

export default SettingsPage;
