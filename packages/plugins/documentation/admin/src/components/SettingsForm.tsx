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
  ToggleInput,
  Typography,
  FieldAction,
} from '@strapi/design-system';
// Strapi Icons
import { Check, Eye as Show, EyeStriked as Hide } from '@strapi/icons';
import { translatedErrors, useRBAC } from '@strapi/strapi/admin';
import { Form, Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import * as yup from 'yup';

import { PERMISSIONS } from '../constants';
import { DocumentInfos, SettingsInput } from '../types';
import { getTrad } from '../utils';

const schema = yup.object().shape({
  restrictedAccess: yup.boolean(),
  password: yup.string().when('restrictedAccess', (value, initSchema) => {
    return value ? initSchema.required(translatedErrors.required.id) : initSchema;
  }),
});

const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1.6rem;
    width: 1.6rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

type SettingsFormProps = {
  data?: DocumentInfos;
  onSubmit: (body: SettingsInput, formik: FormikHelpers<SettingsInput>) => Promise<void>;
};

export const SettingsForm = ({ data, onSubmit }: SettingsFormProps) => {
  const { formatMessage } = useIntl();
  const [passwordShown, setPasswordShown] = React.useState(false);
  const { allowedActions } = useRBAC(PERMISSIONS);

  return (
    <Formik
      enableReinitialize
      initialValues={{
        restrictedAccess: data?.documentationAccess.restrictedAccess || false,
        password: '',
      }}
      onSubmit={onSubmit}
      validationSchema={schema}
    >
      {({
        handleSubmit,
        values,
        handleChange,
        errors,
        setFieldTouched,
        setFieldValue,
        setFieldError,
        dirty,
      }) => {
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
                <Button
                  type="submit"
                  startIcon={<Check />}
                  disabled={!dirty && allowedActions.canUpdate}
                >
                  {formatMessage({
                    id: getTrad('pages.SettingsPage.Button.save'),
                    defaultMessage: 'Save',
                  })}
                </Button>
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
                            setFieldError('password', undefined);
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
                                  defaultMessage: errors.password,
                                })
                              : undefined
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
  );
};
