import * as React from 'react';

import { Box, Button, Checkbox, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';
import { useSecuritySettingsSave } from '../hooks/useSecuritySettingsSave';
import { isPasskeysDisable, requiresPasskeysCredentials } from '../utils/isSecurityDowngrade';

import { ConfirmDowngradeDialog } from './ConfirmDowngradeDialog';

import type { PasskeySettings } from '../../../../../../../shared/contracts/security-settings';

interface PasskeysCardProps {
  settings: PasskeySettings;
  canUpdate: boolean;
  /** Decides whether the off-transition needs a code. */
  callerEnrolled: boolean;
  /** An SSO-only administrator has none, and the server exempts exactly that account from
   * presenting credentials. Defaults to `true`, so an unwired caller asks rather than skips. */
  hasLocalPassword?: boolean;
  /** `isFetching` of the `SecuritySettings` query; keeps Save disabled while the saved result lands. */
  isRefreshing?: boolean;
}

/**
 * The only asymmetric card on the page: turning passkeys on destroys nothing, while turning them
 * off deletes every passkey every administrator holds, irreversibly -- so a stolen session must
 * not manage it with one `PUT` and a dialog the attacker never looks at. The dialog's copy is
 * overridden because the shared heading names "lowering two-factor requirements", which this is
 * not, and `requiresCredentials` factors in `hasLocalPassword` so an SSO-only administrator can
 * still complete the save the server would let them.
 */
const PasskeysCard = ({
  settings,
  canUpdate,
  callerEnrolled,
  hasLocalPassword = true,
  isRefreshing = false,
}: PasskeysCardProps) => {
  const { formatMessage } = useIntl();
  const titleId = React.useId();

  const [enabled, setEnabled] = React.useState(settings.enabled);

  React.useEffect(() => {
    setEnabled(settings.enabled);
  }, [settings]);

  const next: PasskeySettings = { enabled };
  const modified = next.enabled !== settings.enabled;

  const { save, isSaving, saveError, downgradeOpen, closeDowngrade, confirmDowngrade } =
    useSecuritySettingsSave({
      patch: { passkeys: next },
      requiresCredentials: requiresPasskeysCredentials(
        hasLocalPassword,
        isPasskeysDisable(settings, next)
      ),
    });

  return (
    // `Panel` hardcodes its own outer `Box` and forwards props only to the inner `Flex`, so a
    // `tag` given to it would land inside the panel rather than on its root. The `section`
    // landmark goes on this wrapper, which adds no styling of its own.
    <Box tag="section" aria-labelledby={titleId}>
      <Panel gap={5}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" tag="h2" id={titleId}>
            {formatMessage({
              id: 'Settings.security.passkeys.title',
              defaultMessage: 'Passkeys',
            })}
          </Typography>
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'Settings.security.passkeys.description',
              defaultMessage:
                'Let users register a passkey (Touch ID, Windows Hello, a security key or a phone) and sign in with it instead of a code. A passkey is bound to the domain this admin panel is served on, so it cannot be used on a look-alike site.',
            })}
          </Typography>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <Checkbox
            name="passkeys-enabled"
            disabled={!canUpdate}
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          >
            {formatMessage({
              id: 'Settings.security.passkeys.enabled.label',
              defaultMessage: 'Allow users to sign in with a passkey',
            })}
          </Checkbox>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.security.passkeys.hint',
              defaultMessage:
                'A passkey is always a second factor, never a replacement for the authenticator app. Turning this off deletes every passkey already registered.',
            })}
          </Typography>
          <ErrorMessage error={saveError} />
        </Flex>

        <Flex justifyContent="flex-end">
          <Button
            onClick={save}
            loading={isSaving}
            disabled={!canUpdate || !modified || isRefreshing}
          >
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        </Flex>

        <ConfirmDowngradeDialog
          open={downgradeOpen}
          requiresCode={callerEnrolled}
          onClose={closeDowngrade}
          onConfirm={confirmDowngrade}
          title={formatMessage({
            id: 'Settings.security.passkeys.disable.title',
            defaultMessage: 'Turn passkeys off?',
          })}
          description={formatMessage({
            id: 'Settings.security.passkeys.disable.description',
            defaultMessage:
              'Turning passkeys off deletes every passkey your users have registered.',
          })}
        />
      </Panel>
    </Box>
  );
};

export { PasskeysCard };
export type { PasskeysCardProps };
