import { MultiSelect, MultiSelectOption } from '@strapi/design-system';
import { Loader as LoadingIcon } from '@strapi/icons';
import { FieldInputProps } from 'formik';
import { useIntl } from 'react-intl';
import styled, { keyframes } from 'styled-components';

import { useAdminRoles } from '../../../../../hooks/useAdminRoles';

import type { Entity } from '@strapi/types';

interface SelectRolesProps extends Pick<FieldInputProps<Entity.ID[]>, 'onChange' | 'value'> {
  disabled?: boolean;
  error?: string;
}

const SelectRoles = ({ disabled, error, onChange, value }: SelectRolesProps) => {
  const { isLoading, roles } = useAdminRoles();

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

  return (
    <MultiSelect
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
      startIcon={isLoading ? <Loader /> : undefined}
      value={value.map((v) => v.toString())}
      withTags
      required
    >
      {roles.map((role) => {
        return (
          <MultiSelectOption key={role.id} value={role.id.toString()}>
            {formatMessage({
              id: `global.${role.code}`,
              defaultMessage: role.name,
            })}
          </MultiSelectOption>
        );
      })}
    </MultiSelect>
  );
};

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

export { SelectRoles };
