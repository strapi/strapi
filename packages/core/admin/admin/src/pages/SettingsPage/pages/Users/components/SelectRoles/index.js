import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Select, Option } from '@strapi/design-system';
import { useQuery } from 'react-query';
import styled, { keyframes } from 'styled-components';
import LoadingIcon from '@strapi/icons/Loader';
import { axiosInstance } from '../../../../../../core/utils';

const rotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

const LoadingWrapper = styled.div`
  animation: ${rotation} 2s infinite linear;
`;

const Loader = () => (
  <LoadingWrapper>
    <LoadingIcon />
  </LoadingWrapper>
);

const fetchData = async () => {
  const { data } = await axiosInstance.get('/admin/roles');

  return data.data;
};

const SelectRoles = ({ disabled, error, onChange, value }) => {
  const { status, data } = useQuery(['roles'], fetchData, {
    staleTime: 50000,
  });
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage({
    id: 'app.components.Users.ModalCreateBody.block-title.roles',
    defaultMessage: "User's roles",
  });
  const hint = formatMessage({
    id: 'app.components.Users.ModalCreateBody.block-title.roles.description',
    defaultMessage: 'A user can have one or several roles',
  });
  const placeholder = formatMessage({
    id: 'app.components.Select.placeholder',
    defaultMessage: 'Select',
  });
  const startIcon = status === 'loading' ? <Loader /> : undefined;

  return (
    <Select
      id="roles"
      disabled={disabled}
      error={errorMessage}
      hint={hint}
      label={label}
      name="roles"
      onChange={(v) => {
        onChange({ target: { name: 'roles', value: v } });
      }}
      placeholder={placeholder}
      multi
      startIcon={startIcon}
      value={value}
      withTags
      required
    >
      {(data || []).map((role) => {
        return (
          <Option key={role.id} value={role.id}>
            {formatMessage({
              id: `global.${role.code}`,
              defaultMessage: role.name,
            })}
          </Option>
        );
      })}
    </Select>
  );
};

SelectRoles.defaultProps = {
  disabled: false,
  error: undefined,
};

SelectRoles.propTypes = {
  disabled: PropTypes.bool,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array.isRequired,
};

export default SelectRoles;
