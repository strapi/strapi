import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import get from 'lodash/get';
import omit from 'lodash/omit';
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
  Link,
  Row,
} from '@strapi/parts';
import { Form, useQuery, useNotification } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Formik } from 'formik';
import axios from 'axios';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../Logo';
import AuthButton from '../AuthButton';
import FieldActionWrapper from '../FieldActionWrapper';

const CenteredBox = styled(Box)`
  text-align: center;
`;
const A = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
`;

const Register = ({ fieldsToDisable, noSignin, onSubmit, schema }) => {
  const toggleNotification = useNotification();
  const { push } = useHistory();
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const { formatMessage } = useIntl();
  const query = useQuery();
  const registrationToken = query.get('registrationToken');

  useEffect(() => {
    if (registrationToken) {
      const getData = async () => {
        try {
          const {
            data: { data },
          } = await axios.get(
            `${strapi.backendURL}/admin/registration-info?registrationToken=${registrationToken}`
          );

          if (data) {
            setUserInfo(data);
          }
        } catch (err) {
          const errorMessage = get(err, ['response', 'data', 'message'], 'An error occurred');

          toggleNotification({
            type: 'warning',
            message: errorMessage,
          });

          // Redirect to the oops page in case of an invalid token
          // @alexandrebodin @JAB I am not sure it is the wanted behavior
          push(`/auth/oops?info=${encodeURIComponent(errorMessage)}`);
        }
      };

      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationToken]);

  return (
    <UnauthenticatedLayout>
      <LayoutContent>
        <Formik
          enableReinitialize
          initialValues={{
            firstname: userInfo.firstname || '',
            lastname: userInfo.lastname || '',
            email: userInfo.email || '',
            password: '',
            confirmPassword: '',
            registrationToken: registrationToken || undefined,
            news: false,
          }}
          onSubmit={(data, formik) => {
            if (registrationToken) {
              // We need to pass the registration token in the url param to the api in order to submit another admin user
              onSubmit({ userInfo: omit(data, ['registrationToken']), registrationToken }, formik);
            } else {
              onSubmit(data, formik);
            }
          }}
          validationSchema={schema}
          validateOnChange={false}
        >
          {({ values, errors, handleChange }) => (
            <Form noValidate>
              <Main labelledBy="welcome">
                <Column>
                  <Logo />
                  <Box paddingTop="6" paddingBottom="1">
                    <H1 id="welcome">{formatMessage({ id: 'Auth.form.welcome.title' })}</H1>
                  </Box>
                  <CenteredBox paddingBottom="7">
                    <Subtitle textColor="neutral600">
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
                        error={
                          errors.firstname ? formatMessage({ id: errors.firstname }) : undefined
                        }
                        onChange={handleChange}
                        label={formatMessage({ id: 'Auth.form.firstname.label' })}
                      />
                    </GridItem>
                    <GridItem col={6}>
                      <TextInput
                        name="lastname"
                        error={errors.lastname ? formatMessage({ id: errors.lastname }) : undefined}
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
                    error={errors.email ? formatMessage({ id: errors.email }) : undefined}
                    required
                    label={formatMessage({ id: 'Auth.form.email.label' })}
                    type="email"
                  />
                  <TextInput
                    name="password"
                    onChange={handleChange}
                    value={values.password}
                    error={errors.password ? formatMessage({ id: errors.password }) : undefined}
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
                    hint={formatMessage({ id: 'Auth.form.password.hint' })}
                    required
                    label={formatMessage({ id: 'Auth.form.password.label' })}
                    type={passwordShown ? 'text' : 'password'}
                  />
                  <TextInput
                    name="confirmPassword"
                    onChange={handleChange}
                    value={values.confirmPassword}
                    error={
                      errors.confirmPassword
                        ? formatMessage({ id: errors.confirmPassword })
                        : undefined
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
                          <A target="_blank" href="https://strapi.io/terms" rel="noreferrer">
                            {formatMessage({ id: 'Auth.privacy-policy-agreement.terms' })}
                          </A>
                        ),
                        policy: (
                          <A target="_blank" href="https://strapi.io/privacy" rel="noreferrer">
                            {formatMessage({ id: 'Auth.privacy-policy-agreement.policy' })}
                          </A>
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
  noSignin: PropTypes.bool,
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
};

export default Register;
