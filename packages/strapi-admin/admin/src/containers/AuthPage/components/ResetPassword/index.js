import React from 'react';
import { useIntl } from 'react-intl';
import { Padded } from '@buffetjs/core';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import Button from '../../../../components/FullWidthButton';
import AuthLink from '../AuthLink';
import Input from '../Input';
import Logo from '../Logo';
import Section from '../Section';
import Box from '../Box';

const ResetPassword = ({ formErrors, modifiedData, onChange, onSubmit, requestError }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground>
        <BaselineAlignment top size="25px">
          <Box errorMessage={get(requestError, 'errorMessage', null)}>
            <form onSubmit={onSubmit}>
              <Input
                autoFocus
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
                label="Auth.form.confirmPassword.label"
                name="confirmPassword"
                onChange={onChange}
                type="password"
                validations={{ required: true }}
                value={modifiedData.confirmPassword}
              />
              <BaselineAlignment top size="3px" />
              <Padded top>
                <Button type="submit" color="primary" textTransform="uppercase">
                  {formatMessage({ id: 'Auth.form.button.reset-password' })}
                </Button>
              </Padded>
            </form>
          </Box>
        </BaselineAlignment>
      </Section>
      <AuthLink label="Auth.link.ready" to="/auth/login" />
    </>
  );
};

ResetPassword.defaultProps = {
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

ResetPassword.propTypes = {
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default ResetPassword;
