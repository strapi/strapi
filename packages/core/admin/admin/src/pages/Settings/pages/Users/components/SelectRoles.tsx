import { MultiSelect, MultiSelectOption } from '@strapi/design-system';
import { Loader as LoadingIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, keyframes } from 'styled-components';

import { useField } from '../../../../../components/Form';
import { useAdminRoles } from '../../../../../hooks/useAdminRoles';

interface SelectRolesProps {
  disabled?: boolean;
}

const SelectRoles = ({ disabled }: SelectRolesProps) => {
  const { isLoading, roles } = useAdminRoles();

  const { formatMessage } = useIntl();
  const { value = [], onChange, error } = useField<string[]>('roles');

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
      error={error}
      hint={hint}
      label={label}
      name="roles"
      onChange={(v) => {
        onChange('roles', v);
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
