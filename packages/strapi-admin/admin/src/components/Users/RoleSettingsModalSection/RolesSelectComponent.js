import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Padded } from '@buffetjs/core';
import { Label, Description as BaseDescription } from '@buffetjs/styles';
import { Col } from 'reactstrap';
import styled from 'styled-components';

import SelectRoles from '../SelectRoles';

const Description = styled(BaseDescription)`
  font-size: ${({ theme }) => theme.main.sizes.fonts.md};
  line-height: normal;
`;

const RolesSelectComponent = ({ isDisabled, value, error, onChange }) => {
  const { formatMessage } = useIntl();

  return (
    <Col xs="6">
      <Padded bottom size="xs">
        <Label style={{ display: 'block' }} htmlFor="roles">
          {formatMessage({ id: 'app.components.Users.ModalCreateBody.block-title.roles' })}
        </Label>
      </Padded>
      <SelectRoles
        isDisabled={isDisabled}
        name="roles"
        onChange={onChange}
        value={value}
        error={error}
      />
      <Description>
        {formatMessage({
          id: 'app.components.Users.ModalCreateBody.block-title.roles.description',
        })}
      </Description>
    </Col>
  );
};

RolesSelectComponent.defaultProps = {
  value: null,
  error: null,
};
RolesSelectComponent.propTypes = {
  isDisabled: PropTypes.bool.isRequired,
  value: PropTypes.array,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default RolesSelectComponent;
