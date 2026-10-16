import * as React from 'react';

import { Box, Button, Checkbox, Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useNotification } from '../../features/Notifications';

interface RecoveryCodesProps {
  codes: string[];
  onAcknowledged: () => Promise<void> | void;
  /** The user's own assertion that the codes are saved, so a host dialog can let them leave. */
  onSavedChange?: (saved: boolean) => void;
}

const CodeTypography = styled(Typography)`
  font-family: monospace;
`;

/**
 * Shows a freshly issued recovery-code set exactly once. The server never returns these again,
 * so acknowledging is mandatory: the confirming button stays disabled until the checkbox is
 * ticked. Copy and download are conveniences; nothing here is stored by the app.
 */
const RecoveryCodes = ({ codes, onAcknowledged, onSavedChange }: RecoveryCodesProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [saved, setSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const text = codes.join('\n');
  const headingId = React.useId();
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // The codes arrive when the step changes, and are the only way back into a locked account. Moving
  // focus to their heading announces them to a screen reader and puts a keyboard user at the top of
  // the new step, rather than leaving both wherever the previous step's button was.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  /**
   * A Blob and an object URL rather than a `data:` href: the codes are not left sitting in a link's
   * attribute for as long as the step is on screen, and the URL is revoked once the save starts.
   */
  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'strapi-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.profile.form.section.mfa.codes.copied',
          defaultMessage: 'Recovery codes copied',
        }),
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      await onAcknowledged();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography>
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.codes.intro',
          defaultMessage:
            'Each recovery code can be used once instead of an authenticator code if you lose your device. Store them somewhere safe. They will not be shown again.',
        })}
      </Typography>
      <Box background="neutral100" hasRadius padding={4} role="group" aria-labelledby={headingId}>
        <Typography
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          tag="h3"
          variant="sigma"
          textColor="neutral600"
        >
          {formatMessage(
            {
              id: 'Settings.profile.form.section.mfa.codes.heading',
              defaultMessage: 'Your {count} recovery codes',
            },
            { count: codes.length }
          )}
        </Typography>
        <Grid.Root tag="ul" gap={2} paddingTop={3}>
          {codes.map((code) => (
            <Grid.Item tag="li" key={code} col={6} xs={12}>
              <CodeTypography variant="pi" data-testid="mfa-recovery-code">
                {code}
              </CodeTypography>
            </Grid.Item>
          ))}
        </Grid.Root>
      </Box>
      <Flex gap={2}>
        <Button variant="secondary" onClick={handleCopy}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.codes.copy',
            defaultMessage: 'Copy',
          })}
        </Button>
        <Button variant="secondary" onClick={handleDownload}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.codes.download',
            defaultMessage: 'Download',
          })}
        </Button>
      </Flex>
      <Checkbox
        checked={saved}
        onCheckedChange={(value) => {
          setSaved(value === true);
          onSavedChange?.(value === true);
        }}
      >
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.codes.saved',
          defaultMessage: 'I have saved these codes somewhere safe',
        })}
      </Checkbox>
      <Flex justifyContent="flex-end">
        <Button disabled={!saved} loading={submitting} onClick={handleAcknowledge}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.codes.done',
            defaultMessage: 'I have saved my recovery codes',
          })}
        </Button>
      </Flex>
    </Flex>
  );
};

export { RecoveryCodes };
export type { RecoveryCodesProps };
