import * as React from 'react';

import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Modal,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import {
  useGetMemberCandidatesQuery,
  useGetMembersQuery,
  useRemoveMemberMutation,
  useUpsertMemberMutation,
  type Space,
} from '../services/api';
import { formatApiError } from '../utils/formatApiError';
import { getTranslation } from '../utils/getTranslation';

interface AdminRole {
  id: number;
  name: string;
  code: string;
}

interface MembersModalProps {
  space: Space;
  onClose: () => void;
}

const MembersModal = ({ space, onClose }: MembersModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();

  const { data: members = [], isLoading } = useGetMembersQuery(space.id);
  const { data: candidates = [] } = useGetMemberCandidatesQuery(space.id);
  const [upsertMember] = useUpsertMemberMutation();
  const [removeMember] = useRemoveMemberMutation();

  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);

  React.useEffect(() => {
    get<{ data: AdminRole[] }>('/admin/roles')
      .then(({ data }) => setRoles(data.data ?? []))
      .catch(() => setRoles([]));
  }, [get]);

  const handleAdd = async () => {
    if (selectedUser === null) {
      return;
    }

    const result = await upsertMember({
      spaceId: space.id,
      user: selectedUser,
      roles: selectedRoles.map(Number),
    });

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });

      return;
    }

    setSelectedUser(null);
    setSelectedRoles([]);
  };

  const handleRoleChange = async (userId: number, roleIds: string[]) => {
    const result = await upsertMember({
      spaceId: space.id,
      user: userId,
      roles: roleIds.map(Number),
    });

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });
    }
  };

  const handleRemove = async (userId: number) => {
    const result = await removeMember({ spaceId: space.id, userId });

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });
    }
  };

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage(
              {
                id: getTranslation('members.title'),
                defaultMessage: 'Members of {name}',
              },
              { name: space.name }
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTranslation('members.hint'),
                defaultMessage:
                  'Leaving the roles empty keeps whatever roles the member holds across the project. Choosing roles here overrides them, for this space only.',
              })}
            </Typography>

            <Flex gap={2} alignItems="flex-end">
              <Box flex="1">
                <SingleSelect
                  aria-label={formatMessage({
                    id: getTranslation('members.add'),
                    defaultMessage: 'Add a member',
                  })}
                  placeholder={formatMessage({
                    id: getTranslation('members.add'),
                    defaultMessage: 'Add a member',
                  })}
                  value={selectedUser ?? undefined}
                  onChange={(value: string | number) => setSelectedUser(Number(value))}
                >
                  {candidates.map((user) => (
                    <SingleSelectOption key={user.id} value={user.id}>
                      {displayName(user)}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>

              <Box flex="1">
                <MultiSelect
                  aria-label={formatMessage({
                    id: getTranslation('members.roles'),
                    defaultMessage: 'Roles in this space',
                  })}
                  placeholder={formatMessage({
                    id: getTranslation('members.roles.placeholder'),
                    defaultMessage: 'Their usual roles',
                  })}
                  value={selectedRoles}
                  onChange={(value: string[]) => setSelectedRoles(value)}
                >
                  {roles.map((role) => (
                    <MultiSelectOption key={role.id} value={String(role.id)}>
                      {role.name}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
              </Box>

              <Button onClick={handleAdd} disabled={selectedUser === null}>
                {formatMessage({ id: getTranslation('members.addAction'), defaultMessage: 'Add' })}
              </Button>
            </Flex>

            {isLoading ? null : (
              <Table colCount={3} rowCount={members.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTranslation('members.user'),
                          defaultMessage: 'User',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTranslation('members.roles'),
                          defaultMessage: 'Roles in this space',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTranslation('members.actions'),
                          defaultMessage: 'Actions',
                        })}
                      </Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {members.map((member) => (
                    <Tr key={member.id}>
                      <Td>
                        <Typography textColor="neutral800">{displayName(member.user)}</Typography>
                      </Td>
                      <Td>
                        <MultiSelect
                          size="S"
                          aria-label={formatMessage({
                            id: getTranslation('members.roles'),
                            defaultMessage: 'Roles in this space',
                          })}
                          placeholder={formatMessage({
                            id: getTranslation('members.roles.placeholder'),
                            defaultMessage: 'Their usual roles',
                          })}
                          value={member.roles.map((role) => String(role.id))}
                          onChange={(value: string[]) => handleRoleChange(member.user.id, value)}
                        >
                          {roles.map((role) => (
                            <MultiSelectOption key={role.id} value={String(role.id)}>
                              {role.name}
                            </MultiSelectOption>
                          ))}
                        </MultiSelect>
                      </Td>
                      <Td>
                        <IconButton
                          label={formatMessage({
                            id: getTranslation('members.remove'),
                            defaultMessage: 'Remove from this space',
                          })}
                          variant="ghost"
                          onClick={() => handleRemove(member.user.id)}
                        >
                          <Trash />
                        </IconButton>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: getTranslation('members.done'), defaultMessage: 'Done' })}
            </Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const displayName = (user: { firstname?: string; lastname?: string; email: string }) =>
  [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email;

export { MembersModal };
