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
  /** `/admin/mfa/me` `enabled` for the caller: decides whether the off-transition needs a code. */
  callerEnrolled: boolean;
  /**
   * `/admin/mfa/me` `hasLocalPassword` for the caller: an
   * SSO-only administrator has none, and the server exempts exactly that account from presenting
   * credentials to turn passkeys off. Defaults to `true`, so a caller that has not wired this
   * prop through asks for credentials rather than skipping them.
   */
  hasLocalPassword?: boolean;
  /** `isFetching` of the `SecuritySettings` query; keeps Save disabled while the saved result lands. */
  isRefreshing?: boolean;
}

/**
 * The third card on the Security page. One checkbox, saved alone: `PUT
 * /admin/security-settings` is per object, so the body never carries `mfa` or `trustedDevices`.
 *
 * Only the **off**-transition collects credentials, and it is the only asymmetric card on the
 * page. Turning passkeys on adds a phishing-resistant factor and destroys nothing. Turning them
 * off deletes every passkey every administrator has registered, organisation-wide and
 * irreversibly -- so a stolen session must not be able to wipe them with one `PUT` and a dialog
 * the attacker never looks at. That is `isPasskeysDisable`, the mirror of the server's
 * `disablesPasskeys` term.
 *
 * The dialog's copy is overridden for the same reason: the shared heading names "lowering
 * two-factor requirements", which is not what this save does.
 *
 * The off-transition's `requiresCredentials` also factors in `hasLocalPassword`, mirroring the
 * server's password-less exemption -- otherwise an SSO-only administrator could never complete
 * this save from the UI at all, even though the server lets them.
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
