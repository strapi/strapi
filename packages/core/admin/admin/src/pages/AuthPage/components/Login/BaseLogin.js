import React, { useState } from 'react';
import { Show, Hide } from '@strapi/icons';
import {
  Box,
  Stack,
  H1,
  Text,
  Subtitle,
  Button,
  Checkbox,
  TextInput,
  Main,
  FieldAction,
} from '@strapi/parts';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';

import { Column } from '../../../../layouts/UnauthenticatedLayout';
import { useConfigurations } from '../../../../hooks';
import Form from './Form';

const AuthButton = styled(Button)`
  display: inline-block;
  width: 100%;
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

const Login = ({ onSubmit, schema }) => {
  const [passwordShown, setPasswordShown] = useState(false);
  const { authLogo } = useConfigurations();
  const { formatMessage } = useIntl();

  return (
    <Main labelledBy="welcome">
      <Formik
        enableReinitialize
        initialValues={{
          email: '',
          password: '',
        }}
        onSubmit={onSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ values, errors, handleChange }) => (
          <Form noValidate>
            <Column>
              <img src={authLogo} alt="" aria-hidden style={{ height: '72px' }} />
              <Box paddingTop="6" paddingBottom="1">
                <H1 id="welcome">{formatMessage({ id: 'Auth.form.welcome.title' })}</H1>
              </Box>
              <Box paddingBottom="7">
                <Subtitle textColor="neutral600">
                  {formatMessage({ id: 'Auth.form.welcome.subtitle' })}
                </Subtitle>
              </Box>
              {errors.errorMessage && <Text textColor="danger600">{errors.errorMessage}</Text>}
            </Column>

            <Stack size={6}>
              <TextInput
                error={errors.email ? formatMessage({ id: errors.email }) : ''}
                value={values.email}
                onChange={handleChange}
                label={formatMessage({ id: 'Auth.form.email.label' })}
                placeholder={formatMessage({ id: 'Auth.form.email.placeholder' })}
                name="email"
                required
              />
              <TextInput
                error={errors.password ? formatMessage({ id: errors.password }) : ''}
                onChange={handleChange}
                value={values.password}
                label={formatMessage({ id: 'Auth.form.password.label' })}
                name="password"
                type={passwordShown ? 'text' : 'password'}
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
              />
              <Checkbox
                onValueChange={checked => {
                  handleChange({ target: { value: checked, name: 'rememberMe' } });
                }}
                value={values.rememberMe}
                name="rememberMe"
              >
                {formatMessage({ id: 'Auth.form.rememberMe.label' })}
              </Checkbox>
              <AuthButton type="submit">
                {formatMessage({ id: 'Auth.form.button.login' })}
              </AuthButton>
            </Stack>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

Login.defaultProps = {
  onSubmit: () => {},
};

Login.propTypes = {
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
};

export default Login;
