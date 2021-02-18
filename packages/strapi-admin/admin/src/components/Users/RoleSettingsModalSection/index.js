import React from 'react';
import PropTypes from 'prop-types';
import { ModalSection } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';
import { Row } from 'reactstrap';
import { useIntl } from 'react-intl';
import roleSettingsForm from 'ee_else_ce/components/Users/ModalCreateBody/utils/roleSettingsForm';

import Input from '../../SizedInput';
import Wrapper from '../ModalCreateBody/Wrapper';

const RoleSettingsModalSection = ({ isDisabled, modifiedData, onChange, formErrors }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalSection>
      <Wrapper>
        <Padded top size="smd">
          <Row>
            {Object.keys(roleSettingsForm).map(inputName => {
              const value = modifiedData[inputName];
              const { description, type, Component } = roleSettingsForm[inputName];
              const error = formErrors[inputName];

              if (Component) {
                return (
                  <Component
                    key={inputName}
                    value={value}
                    onChange={onChange}
                    error={error}
                    isDisabled={isDisabled}
                  />
                );
              }

              return (
                <Input
                  {...roleSettingsForm[inputName]}
                  key={inputName}
                  description={formatMessage({ id: description })}
                  type={type}
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

RoleSettingsModalSection.defaultProps = {
  isDisabled: false,
  formErrors: {},
};

RoleSettingsModalSection.propTypes = {
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

export default RoleSettingsModalSection;
