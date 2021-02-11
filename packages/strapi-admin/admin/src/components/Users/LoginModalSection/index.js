import React from 'react';
import PropTypes from 'prop-types';
import { ModalSection } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';
import { Row } from 'reactstrap';
import { useIntl } from 'react-intl';
import loginSettingsForm from 'ee_else_ce/components/Users/ModalCreateBody/utils/loginSettingsForm';

import Input from '../../SizedInput';
import Wrapper from '../ModalCreateBody/Wrapper';

const LoginModalSection = ({ isDisabled, modifiedData, onChange, formErrors }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalSection>
      <Wrapper>
        <Padded top size="smd">
          <Row>
            {Object.keys(loginSettingsForm).map(inputName => {
              if (loginSettingsForm[inputName].Component) {
                const { Component } = loginSettingsForm[inputName];

                return (
                  <Component
                    key={inputName}
                    value={modifiedData[inputName]}
                    onChange={onChange}
                    error={formErrors[inputName]}
                    isDisabled={isDisabled}
                  />
                );
              }

              return (
                <Input
                  {...loginSettingsForm[inputName]}
                  key={inputName}
                  description={formatMessage({ id: loginSettingsForm[inputName].description })}
                  type={loginSettingsForm[inputName].type}
                  disabled={isDisabled}
                  name={inputName}
                  onChange={onChange}
                  value={modifiedData.useSSORegistration}
                  error={formErrors.useSSORegistration}
                />
              );
            })}
          </Row>
        </Padded>
      </Wrapper>
    </ModalSection>
  );
};

LoginModalSection.defaultProps = {
  isDisabled: false,
  formErrors: {},
};

LoginModalSection.propTypes = {
  isDisabled: PropTypes.bool,
  modifiedData: PropTypes.shape({
    roles: PropTypes.array,
    useSSORegistration: PropTypes.bool,
  }).isRequired,
  formErrors: PropTypes.shape({
    roles: PropTypes.array,
    useSSORegistration: PropTypes.bool,
  }),
  onChange: PropTypes.func.isRequired,
};

export default LoginModalSection;
