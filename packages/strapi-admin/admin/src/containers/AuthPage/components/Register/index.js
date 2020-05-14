/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import AuthLink from '../AuthLink';
import Button from '../Button';
import CustomLabel from '../../CustomLabel';
import Input from '../Input';
import Logo from '../Logo';
import Section from '../Section';
import Box from '../Box';
import Checkbox from './Checkbox';
import InputWrapper from './InputWrapper';

const Register = ({
  fieldsToDisable,
  formErrors,
  modifiedData,
  onChange,
  onSubmit,
  requestError,
}) => {
  const { formatMessage } = useIntl();

  const handleClick = (e, to) => {
    e.preventDefault();
    e.stopPropagation();

    const win = window.open(`https://strapi.io/${to}`, '_blank');
    win.focus();
  };

  const terms = (
    <FormattedMessage id="Auth.privacy-policy-agreement.terms">
      {content => (
        <span
          style={{ color: '#0097f7', cursor: 'pointer' }}
          onClick={e => handleClick(e, 'terms')}
        >
          {content}
        </span>
      )}
    </FormattedMessage>
  );
  const policy = (
    <FormattedMessage id="Auth.privacy-policy-agreement.policy">
      {content => (
        <span
          style={{ color: '#0097f7', cursor: 'pointer' }}
          onClick={e => handleClick(e, 'privacy')}
        >
          {content}
        </span>
      )}
    </FormattedMessage>
  );

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground>
        <Padded top size="23px">
          <Box errorMessage={get(requestError, 'errorMessage', null)}>
            <form onSubmit={onSubmit}>
              <InputWrapper>
                <Input
                  autoFocus
                  error={formErrors.firstname}
                  label="Auth.form.firstname.label"
                  name="firstname"
                  onChange={onChange}
                  placeholder="Auth.form.firstname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={modifiedData.firstname}
                />
                <Input
                  autoFocus
                  error={formErrors.lastname}
                  label="Auth.form.lastname.label"
                  name="lastname"
                  onChange={onChange}
                  placeholder="Auth.form.lastname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={modifiedData.lastname}
                />
              </InputWrapper>
              <Input
                autoFocus
                error={formErrors.email}
                disabled={fieldsToDisable.includes('email')}
                label="Auth.form.email.label"
                name="email"
                onChange={onChange}
                placeholder="Auth.form.email.placeholder"
                type="email"
                validations={{ required: true }}
                value={modifiedData.email}
              />
              <Input
                error={formErrors.password}
                label="Auth.form.password.label"
                name="password"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={modifiedData.password}
              />
              <Input
                error={formErrors.confirmPassword}
                label="Auth.form.password.label"
                name="confirmPassword"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={modifiedData.confirmPassword}
              />

              <Checkbox
                message={() => (
                  <CustomLabel id="Auth.form.register.news.label" values={{ terms, policy }} />
                )}
                name="news"
                onChange={onChange}
                value={modifiedData.news}
              />
              <Padded top size="30px">
                <Button type="submit" color="primary">
                  {formatMessage({ id: 'Auth.form.button.register' })}
                </Button>
              </Padded>
            </form>
          </Box>
        </Padded>
      </Section>
      <AuthLink label="Auth.link.signin" to="/auth/login">
        <Text fontSize="md">
          {formatMessage({ id: 'Auth.link.signin.account' })}
          &nbsp;
          <Text fontSize="md" color="#0097f7" as="span">
            {formatMessage({ id: 'Auth.link.signin' })}
          </Text>
        </Text>
      </AuthLink>
    </>
  );
};

Register.defaultProps = {
  fieldsToDisable: [],
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

Register.propTypes = {
  fieldsToDisable: PropTypes.array,
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Register;
