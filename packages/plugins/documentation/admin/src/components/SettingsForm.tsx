import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  TextInput,
  Toggle,
  Typography,
  Field,
} from '@strapi/design-system';
// Strapi Icons
import { Check, Eye as Show, EyeStriked as Hide } from '@strapi/icons';
import { translatedErrors, useRBAC, Layouts } from '@strapi/strapi/admin';
import { Form, Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { PERMISSIONS } from '../constants';
import { DocumentInfos, SettingsInput } from '../types';
import { getTrad } from '../utils';

const schema = yup.object().shape({
  restrictedAccess: yup.boolean(),
  password: yup.string().when('restrictedAccess', (value, initSchema) => {
    return value
      ? initSchema
          .required(translatedErrors.required.id)
          .min(8)
          .matches(/[a-z]/, 'components.Input.error.contain.lowercase')
          .matches(/[A-Z]/, 'components.Input.error.contain.uppercase')
          .matches(/\d/, 'components.Input.error.contain.number')
      : initSchema;
  }),
});

const FieldActionWrapper = styled(Field.Action)`
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
            <Layouts.Header
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
            <Layouts.Content>
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
                  <Typography variant="delta" tag="h2">
                    {formatMessage({
                      id: 'global.settings',
                      defaultMessage: 'Settings',
                    })}
                  </Typography>
                  <Grid.Root gap={4}>
                    <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                      <Field.Root
                        name="restrictedAccess"
                        hint={formatMessage({
                          id: getTrad('pages.SettingsPage.toggle.hint'),
                          defaultMessage: 'Make the documentation endpoint private',
                        })}
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('pages.SettingsPage.toggle.label'),
                            defaultMessage: 'Restricted Access',
                          })}
                        </Field.Label>
                        <Toggle
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
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                    {values.restrictedAccess && (
                      <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                        <Field.Root
                          name="password"
                          error={
                            errors.password
                              ? formatMessage({
                                  id: errors.password,
                                  defaultMessage: errors.password,
                                })
                              : undefined
                          }
                        >
                          <Field.Label>
                            {formatMessage({
                              id: 'global.password',
                              defaultMessage: 'Password',
                            })}
                          </Field.Label>
                          <TextInput
                            placeholder="**********"
                            type={passwordShown ? 'text' : 'password'}
                            value={values.password}
                            onChange={handleChange}
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
                          <Field.Error />
                        </Field.Root>
                      </Grid.Item>
                    )}
                  </Grid.Root>
                </Flex>
              </Box>
            </Layouts.Content>
          </Form>
        );
      }}
    </Formik>
  );
};
