import { MultiSelect, MultiSelectOption } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { Loader as LoadingIcon } from '@strapi/icons';
import { FieldInputProps } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled, { keyframes } from 'styled-components';

import type { FindRoles } from '../../../../../../../shared/contracts/roles';
import type { Entity } from '@strapi/types';

interface SelectRolesProps extends Pick<FieldInputProps<Entity.ID[]>, 'onChange' | 'value'> {
  disabled?: boolean;
  error?: string;
}

const SelectRoles = ({ disabled, error, onChange, value }: SelectRolesProps) => {
  const { get } = useFetchClient();

  const { isLoading, data } = useQuery(
    ['roles'],
    async () => {
      const {
        data: { data },
      } = await get<FindRoles.Response>('/admin/roles');

      return data;
    },
    {
      staleTime: 50000,
    }
  );
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
      {(data ?? []).map((role) => {
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
