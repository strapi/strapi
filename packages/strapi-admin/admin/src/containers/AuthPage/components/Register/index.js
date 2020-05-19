/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import { Checkbox, Flex, Padded, Text } from '@buffetjs/core';
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import Button from '../../../../components/FullWidthButton';
import AuthLink from '../AuthLink';
import Input from '../Input';
import Logo from '../Logo';
import Section from '../Section';
import CustomLabel from './CustomLabel';
import Box from '../Box';
import InputWrapper from './InputWrapper';
import Span from './Span';

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
    <FormattedMessage id="Auth.privacy-policy-agreement.terms" key="1">
      {content => <Span onClick={e => handleClick(e, 'terms')}>{content}</Span>}
    </FormattedMessage>
  );
  const policy = (
    <FormattedMessage id="Auth.privacy-policy-agreement.policy" key="2">
      {content => <Span onClick={e => handleClick(e, 'privacy')}>{content}</Span>}
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
                  error={formErrors['userInfo.firstname']}
                  label="Auth.form.firstname.label"
                  name="userInfo.firstname"
                  onChange={onChange}
                  placeholder="Auth.form.firstname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={get(modifiedData, 'userInfo.firstname', '')}
                />
                <Input
                  autoFocus
                  error={formErrors['userInfo.lastname']}
                  label="Auth.form.lastname.label"
                  name="userInfo.lastname"
                  onChange={onChange}
                  placeholder="Auth.form.lastname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={get(modifiedData, 'userInfo.lastname', '')}
                />
              </InputWrapper>
              <Input
                autoFocus
                error={formErrors['userInfo.email']}
                disabled={fieldsToDisable.includes('email')}
                label="Auth.form.email.label"
                name="userInfo.email"
                onChange={onChange}
                placeholder="Auth.form.email.placeholder"
                type="email"
                validations={{ required: true }}
                value={get(modifiedData, 'userInfo.email', '')}
              />
              <Input
                error={formErrors['userInfo.password']}
                label="Auth.form.password.label"
                name="userInfo.password"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={get(modifiedData, 'userInfo.password', '')}
              />
              <Input
                error={formErrors['userInfo.confirmPassword']}
                label="Auth.form.password.label"
                name="userInfo.confirmPassword"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={get(modifiedData, 'userInfo.confirmPassword', '')}
              />
              <Flex alignItems="flex-start">
                <Checkbox
                  name="userInfo.news"
                  onChange={onChange}
                  value={get(modifiedData, 'userInfo.news', false)}
                />
                <Padded left size="xs" />
                <CustomLabel id="Auth.form.register.news.label" values={{ terms, policy }} />
              </Flex>
              <Padded top size="md">
                <Button type="submit" color="primary" textTransform="uppercase">
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
