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
  inputsPrefix,
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
        <Padded top size="25px">
          <Box errorMessage={get(requestError, 'errorMessage', null)}>
            <form onSubmit={onSubmit}>
              <InputWrapper>
                <Input
                  autoFocus
                  error={formErrors[`${inputsPrefix}firstname`]}
                  label="Auth.form.firstname.label"
                  name={`${inputsPrefix}firstname`}
                  onChange={onChange}
                  placeholder="Auth.form.firstname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={get(modifiedData, `${inputsPrefix}firstname`, '')}
                />
                <Input
                  error={formErrors[`${inputsPrefix}lastname`]}
                  label="Auth.form.lastname.label"
                  name={`${inputsPrefix}lastname`}
                  onChange={onChange}
                  placeholder="Auth.form.lastname.placeholder"
                  type="text"
                  validations={{ required: true }}
                  value={get(modifiedData, `${inputsPrefix}lastname`, '')}
                />
              </InputWrapper>
              <Input
                error={formErrors[`${inputsPrefix}email`]}
                disabled={fieldsToDisable.includes('email')}
                label="Auth.form.email.label"
                name={`${inputsPrefix}email`}
                onChange={onChange}
                placeholder="Auth.form.email.placeholder"
                type="email"
                validations={{ required: true }}
                value={get(modifiedData, `${inputsPrefix}email`, '')}
              />
              <Input
                error={formErrors[`${inputsPrefix}password`]}
                label="Auth.form.password.label"
                name={`${inputsPrefix}password`}
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={get(modifiedData, `${inputsPrefix}password`, '')}
              />
              <Input
                error={formErrors[`${inputsPrefix}confirmPassword`]}
                label="Auth.form.confirmPassword.label"
                name={`${inputsPrefix}confirmPassword`}
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={get(modifiedData, `${inputsPrefix}confirmPassword`, '')}
              />
              <Flex alignItems="flex-start">
                <Checkbox
                  name={`${inputsPrefix}news`}
                  onChange={onChange}
                  value={get(modifiedData, `${inputsPrefix}news`, false)}
                />
                <Padded left size="sm" />
                <CustomLabel
                  id="Auth.form.register.news.label"
                  values={{ terms, policy }}
                  onClick={() => {
                    onChange({
                      target: {
                        name: `${inputsPrefix}news`,
                        value: !get(modifiedData, `${inputsPrefix}news`, false),
                      },
                    });
                  }}
                />
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
  inputsPrefix: '',
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

Register.propTypes = {
  fieldsToDisable: PropTypes.array,
  formErrors: PropTypes.object.isRequired,
  inputsPrefix: PropTypes.string,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Register;
