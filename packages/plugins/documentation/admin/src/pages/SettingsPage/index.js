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
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { TextInput } from '@strapi/design-system/TextInput';
import { Grid, GridItem } from '@strapi/design-system/Grid';

// Strapi Icons
import Show from '@strapi/icons/Eye';
import Hide from '@strapi/icons/EyeStriked';
import Check from '@strapi/icons/Check';

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
                    <Stack spacing={4}>
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
