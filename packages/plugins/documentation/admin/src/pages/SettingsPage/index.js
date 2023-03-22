import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import {
  CheckPermissions,
  Form,
  LoadingIndicatorPage,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';

// Strapi Parts
import {
  ContentLayout,
  HeaderLayout,
  Main,
  Button,
  Box,
  Flex,
  Typography,
  ToggleInput,
  TextInput,
  Grid,
  GridItem,
} from '@strapi/design-system';

// Strapi Icons
import { Eye as Show, EyeStriked as Hide, Check } from '@strapi/icons';

import permissions from '../../permissions';
import { getTrad } from '../../utils';
import useReactQuery from '../utils/useReactQuery';
import FieldActionWrapper from '../../components/FieldActionWrapper';
import schema from '../utils/schema';

const SettingsPage = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { submitMutation, data, isLoading } = useReactQuery();
  const [passwordShown, setPasswordShown] = useState(false);

  const handleUpdateSettingsSubmit = (body) => {
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
            password: '',
          }}
          onSubmit={handleUpdateSettingsSubmit}
          validationSchema={schema}
        >
          {({ handleSubmit, values, handleChange, errors, setFieldTouched, setFieldValue }) => {
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
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'global.settings',
                          defaultMessage: 'Settings',
                        })}
                      </Typography>
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
                            onChange={() => {
                              if (values.restrictedAccess === true) {
                                setFieldValue('password', '', false);
                                setFieldTouched('password', false, false);
                              }

                              setFieldValue('restrictedAccess', !values.restrictedAccess, false);
                            }}
                            onLabel="On"
                            offLabel="Off"
                          />
                        </GridItem>
                        {values.restrictedAccess && (
                          <GridItem col={6} s={12}>
                            <TextInput
                              label={formatMessage({
                                id: 'global.password',
                                defaultMessage: 'Password',
                              })}
                              name="password"
                              placeholder="**********"
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
                                <FieldActionWrapper
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPasswordShown((prev) => !prev);
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
                    </Flex>
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
