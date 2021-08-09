import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Show, Hide } from '@strapi/icons';
import {
  Main,
  Box,
  H1,
  Subtitle,
  Stack,
  TextInput,
  Grid,
  GridItem,
  Checkbox,
  Button,
  FieldAction,
  Link,
  Row,
} from '@strapi/parts';
import PropTypes from 'prop-types';
import { Formik } from 'formik';
import Form from '../../../../components/Form';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import { useConfigurations } from '../../../../hooks';

const AuthButton = styled(Button)`
  display: inline-block;
  width: 100%;
`;
const CenteredBox = styled(Box)`
  text-align: center;
`;
const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 16px;
    width: 16px;
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

const Register = ({ fieldsToDisable, noSignin, onSubmit, modifiedData, schema }) => {
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);
  const { formatMessage } = useIntl();
  const { authLogo } = useConfigurations();

  return (
    <UnauthenticatedLayout>
      <LayoutContent>
        <Formik
          enableReinitialize
          initialValues={{
            // TODO: Fix the initial data during the clean of the AuthLogin codebase
            firstname: modifiedData?.userInfo?.firstname || '',
            lastname: modifiedData?.userInfo?.lastname || '',
            email: modifiedData?.userInfo?.email || '',
            password: modifiedData?.userInfo?.password || '',
            confirmPassword: modifiedData?.userInfo?.confirmPassword || '',
            news: false,
          }}
          onSubmit={onSubmit}
          validationSchema={schema}
          validateOnChange={false}
        >
          {({ values, errors, handleChange }) => (
            <Form noValidate>
              <Main labelledBy="welcome">
                <Column>
                  <img src={authLogo} alt="" aria-hidden style={{ height: '72px' }} />
                  <Box paddingTop="6" paddingBottom="1">
                    <H1 id="welcome">{formatMessage({ id: 'Auth.form.welcome.title' })}</H1>
                  </Box>
                  <CenteredBox paddingBottom="7">
                    <Subtitle style={{ textAlign: 'center' }} textColor="neutral600">
                      {formatMessage({ id: 'Auth.form.register.subtitle' })}
                    </Subtitle>
                  </CenteredBox>
                </Column>
                <Stack size={7}>
                  <Grid gap={4}>
                    <GridItem col={6}>
                      <TextInput
                        name="firstname"
                        required
                        value={values.firstname}
                        error={errors.firstname ? formatMessage({ id: errors.firstname }) : ''}
                        onChange={handleChange}
                        label={formatMessage({ id: 'Auth.form.firstname.label' })}
                      />
                    </GridItem>
                    <GridItem col={6}>
                      <TextInput
                        name="lastname"
                        error={errors.lastname ? formatMessage({ id: errors.lastname }) : ''}
                        required
                        value={values.lastname}
                        onChange={handleChange}
                        label={formatMessage({ id: 'Auth.form.lastname.label' })}
                      />
                    </GridItem>
                  </Grid>
                  <TextInput
                    name="email"
                    disabled={fieldsToDisable.includes('email')}
                    value={values.email}
                    onChange={handleChange}
                    error={errors.email ? formatMessage({ id: errors.email }) : ''}
                    required
                    label={formatMessage({ id: 'Auth.form.email.label' })}
                    type="email"
                  />
                  <TextInput
                    name="password"
                    onChange={handleChange}
                    value={values.password}
                    error={errors.password ? formatMessage({ id: errors.password }) : ''}
                    endAction={
                      // eslint-disable-next-line react/jsx-wrap-multilines
                      <FieldActionWrapper
                        onClick={e => {
                          e.preventDefault();
                          setPasswordShown(prev => !prev);
                        }}
                        label={formatMessage({
                          id: passwordShown
                            ? 'Auth.form.password.show-password'
                            : 'Auth.form.password.hide-password',
                        })}
                      >
                        {passwordShown ? <Show /> : <Hide />}
                      </FieldActionWrapper>
                    }
                    required
                    label={formatMessage({ id: 'Auth.form.password.label' })}
                    type={passwordShown ? 'text' : 'password'}
                  />
                  <TextInput
                    name="confirmPassword"
                    onChange={handleChange}
                    value={values.confirmPassword}
                    error={
                      errors.confirmPassword ? formatMessage({ id: errors.confirmPassword }) : ''
                    }
                    endAction={
                      // eslint-disable-next-line react/jsx-wrap-multilines
                      <FieldActionWrapper
                        onClick={e => {
                          e.preventDefault();
                          setConfirmPasswordShown(prev => !prev);
                        }}
                        label={formatMessage({
                          id: confirmPasswordShown
                            ? 'Auth.form.password.show-password'
                            : 'Auth.form.password.hide-password',
                        })}
                      >
                        {confirmPasswordShown ? <Show /> : <Hide />}
                      </FieldActionWrapper>
                    }
                    required
                    label={formatMessage({ id: 'Auth.form.confirmPassword.label' })}
                    type={confirmPasswordShown ? 'text' : 'password'}
                  />
                  <Checkbox
                    onValueChange={checked => {
                      handleChange({ target: { value: checked, name: 'news' } });
                    }}
                    value={values.news}
                    name="news"
                  >
                    {formatMessage(
                      { id: 'Auth.form.register.news.label' },
                      {
                        terms: (
                          <a target="_blank" href="https://strapi.io/terms" rel="noreferrer">
                            {formatMessage({ id: 'Auth.privacy-policy-agreement.terms' })}
                          </a>
                        ),
                        policy: (
                          <a target="_blank" href="https://strapi.io/privacy" rel="noreferrer">
                            {formatMessage({ id: 'Auth.privacy-policy-agreement.policy' })}
                          </a>
                        ),
                      }
                    )}
                  </Checkbox>
                  <AuthButton size="L" type="submit">
                    {formatMessage({ id: 'Auth.form.button.register' })}
                  </AuthButton>
                </Stack>
              </Main>
            </Form>
          )}
        </Formik>
        {!noSignin && (
          <Box paddingTop={4}>
            <Row justifyContent="center">
              <Link label="Auth.link.signin" to="/auth/login">
                {formatMessage({ id: 'Auth.link.signin.account' })}
              </Link>
            </Row>
          </Box>
        )}
      </LayoutContent>
    </UnauthenticatedLayout>
  );
};

Register.defaultProps = {
  fieldsToDisable: [],
  noSignin: false,
  onSubmit: e => e.preventDefault(),
};

Register.propTypes = {
  fieldsToDisable: PropTypes.array,
  modifiedData: PropTypes.object.isRequired,
  noSignin: PropTypes.bool,
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
};

export default Register;
