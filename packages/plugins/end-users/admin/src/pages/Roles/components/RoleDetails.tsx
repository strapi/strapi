import { InputRenderer, useField, useForm } from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Flex, Grid, Toggle, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import { ExportRoleButton } from './ExportRoleButton';

import type { RoleDetail } from '../../../../../shared/contracts/roles';

/**
 * What the role form edits. Both texts are `null` when emptied: that is what the form stores for
 * an empty input, so a field typed into and cleared again is not a change.
 */
interface RoleDetailsValues {
  name: string | null;
  description: string | null;
  requireTwoFactor: boolean;
}

interface RoleDetailsProps {
  /** `edit` is the only mode with a role of its own: it shows its users and exports it */
  mode: 'edit' | 'create' | 'duplicate';
  /** The role being edited, or the one a duplicate is made from */
  role?: RoleDetail;
  disabled: boolean;
}

/**
 * The box above the editor: the role's name, its users, and the fields of its own (name,
 * description, two-factor). Public has no signed-in users, so two-factor is off there and cannot
 * be turned on (the server refuses it as well).
 */
const RoleDetails = ({ mode, role, disabled }: RoleDetailsProps) => {
  const { formatMessage } = useIntl();
  const values = useForm('RoleDetails', (state) => state.values as RoleDetailsValues);
  const isPublic = mode === 'edit' && role?.type === 'public';
  const usersCount = mode === 'edit' ? (role?.usersCount ?? 0) : 0;
  const twoFactor = useField<boolean>('requireTwoFactor');

  return (
    <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Box>
              <Typography fontWeight="bold">
                {values.name ||
                  formatMessage({
                    id: getTranslation('roles.edit.new-role'),
                    defaultMessage: 'New role',
                  })}
              </Typography>
            </Box>
            <Box>
              <Typography textColor="neutral500" variant="pi">
                {values.description}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2}>
            {mode === 'edit' && role && <ExportRoleButton role={role} />}
            <Button disabled variant="secondary">
              {isPublic
                ? formatMessage({
                    id: getTranslation('roles.edit.users.public'),
                    defaultMessage: 'No signed-in users',
                  })
                : formatMessage(
                    {
                      id: 'Settings.roles.form.button.users-with-role',
                      defaultMessage:
                        '{number, plural, =0 {# users} one {# user} other {# users}} with this role',
                    },
                    { number: usersCount }
                  )}
            </Button>
          </Flex>
        </Flex>
        <Grid.Root gap={4}>
          <Grid.Item xs={12} col={6} direction="column" alignItems="stretch" gap={4}>
            <InputRenderer
              type="string"
              name="name"
              required
              disabled={disabled}
              label={formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
            />
            <Field.Root
              name="requireTwoFactor"
              hint={
                isPublic
                  ? formatMessage({
                      id: getTranslation('roles.edit.two-factor.public'),
                      defaultMessage: 'Public has no signed-in users.',
                    })
                  : formatMessage({
                      id: getTranslation('roles.edit.two-factor.hint'),
                      defaultMessage:
                        'Users with this role set up a second factor before they can sign in.',
                    })
              }
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('roles.edit.two-factor'),
                  defaultMessage: 'Require two-factor authentication',
                })}
              </Field.Label>
              <Toggle
                name="requireTwoFactor"
                checked={isPublic ? false : Boolean(twoFactor.value)}
                onChange={twoFactor.onChange}
                disabled={disabled || isPublic}
                onLabel={formatMessage({
                  id: 'app.components.ToggleCheckbox.enabled-label',
                  defaultMessage: 'Enabled',
                })}
                offLabel={formatMessage({
                  id: 'app.components.ToggleCheckbox.disabled-label',
                  defaultMessage: 'Disabled',
                })}
              />
              <Field.Hint />
            </Field.Root>
          </Grid.Item>
          <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
            <InputRenderer
              type="text"
              name="description"
              disabled={disabled}
              label={formatMessage({ id: 'global.description', defaultMessage: 'Description' })}
            />
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};

export { RoleDetails };
export type { RoleDetailsProps, RoleDetailsValues };
