import * as React from 'react';

import { Box, Button, Checkbox, Flex, Grid, Link, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

interface RecoveryCodesProps {
  codes: string[];
  onAcknowledged: () => Promise<void> | void;
  acknowledgeLabel?: string;
}

const CodeTypography = styled(Typography)`
  font-family: monospace;
`;

/**
 * Shows a freshly issued recovery-code set exactly once. The server never returns these again,
 * so acknowledging is mandatory: the confirming button stays disabled until the checkbox is
 * ticked. Copy and download are conveniences; nothing here is stored by the app.
 */
const RecoveryCodes = ({ codes, onAcknowledged, acknowledgeLabel }: RecoveryCodesProps) => {
  const { formatMessage } = useIntl();
  const [saved, setSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const text = codes.join('\n');
  const href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;

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
      <Box background="neutral100" hasRadius padding={4}>
        <Grid.Root gap={2}>
          {codes.map((code) => (
            <Grid.Item key={code} col={6} xs={12}>
              <CodeTypography variant="pi" data-testid="mfa-recovery-code">
                {code}
              </CodeTypography>
            </Grid.Item>
          ))}
        </Grid.Root>
      </Box>
      <Flex gap={2}>
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(text)}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.codes.copy',
            defaultMessage: 'Copy',
          })}
        </Button>
        <Link href={href} download="strapi-recovery-codes.txt" isExternal={false}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.codes.download',
            defaultMessage: 'Download',
          })}
        </Link>
      </Flex>
      <Checkbox checked={saved} onCheckedChange={(value) => setSaved(value === true)}>
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.codes.saved',
          defaultMessage: 'I have saved these codes somewhere safe',
        })}
      </Checkbox>
      <Flex justifyContent="flex-end">
        <Button disabled={!saved} loading={submitting} onClick={handleAcknowledge}>
          {acknowledgeLabel ??
            formatMessage({
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
