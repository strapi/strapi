import * as React from 'react';

import { Box, Checkbox, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';

import type { PasskeySettings } from '../../../../../../../shared/contracts/security-settings';

interface PasskeysCardProps {
  value: PasskeySettings;
  onChange: (value: PasskeySettings) => void;
  canUpdate: boolean;
  /** A refused save that concerns this card only. */
  saveError?: string;
}

/**
 * The third card on the Security page. Turning passkeys on destroys nothing, while turning them
 * off deletes every passkey every administrator holds, irreversibly; the page's save asks for
 * confirmation (and credentials, see `requiresPasskeysCredentials`) only in that direction.
 */
const PasskeysCard = ({ value, onChange, canUpdate, saveError }: PasskeysCardProps) => {
  const { formatMessage } = useIntl();
  const titleId = React.useId();

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
                'Let users approve the second step of login with their device (Touch ID, Windows Hello, a security key or a phone) instead of typing a code.',
            })}
          </Typography>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <Checkbox
            name="passkeys-enabled"
            disabled={!canUpdate}
            checked={value.enabled}
            onCheckedChange={(checked) => onChange({ enabled: checked === true })}
          >
            {formatMessage({
              id: 'Settings.security.passkeys.enabled.label',
              defaultMessage: 'Allow users to log in with a passkey',
            })}
          </Checkbox>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.security.passkeys.hint',
              defaultMessage: 'Turning passkeys off deletes every registered passkey.',
            })}
          </Typography>
          <ErrorMessage error={saveError} />
        </Flex>
      </Panel>
    </Box>
  );
};

export { PasskeysCard };
export type { PasskeysCardProps };
