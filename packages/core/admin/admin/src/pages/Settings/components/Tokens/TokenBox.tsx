import * as React from 'react';

import { IconButton, Flex, Box, Typography, Button } from '@strapi/design-system';
import { Duplicate, Key } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ContentBox } from '../../../../components/ContentBox';
import { unstableUseGuidedTour } from '../../../../components/UnstableGuidedTour/Context';
import { tours as unstable_tours } from '../../../../components/UnstableGuidedTour/Tours';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useClipboard } from '../../../../hooks/useClipboard';

interface TokenBoxProps {
  token?: string;
  tokenType: 'transfer-token' | 'api-token';
}

const TypographyWordBreak = styled(Typography)`
  word-break: break-all;
`;

export const UnstableApiTokenBox = ({ token, tokenType }: TokenBoxProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();
  const dispatch = unstableUseGuidedTour('TokenBox', (s) => s.dispatch);

  const { copy } = useClipboard();

  const handleClick = (token: TokenBoxProps['token']) => async () => {
    if (token) {
      const didCopy = await copy(token);

      if (didCopy) {
        trackUsage('didCopyTokenKey', {
          tokenType,
        });
        dispatch({
          type: 'set_completed_actions',
          payload: ['didCopyApiToken'],
        });
        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'Settings.tokens.notification.copied' }),
        });
      }
    }
  };

  return (
    <>
      <Flex
        shadow="tableShadow"
        direction="column"
        alignItems="start"
        hasRadius
        padding={6}
        background="neutral0"
      >
        <Flex direction="column" alignItems="start" gap={1} paddingBottom={4}>
          <Typography fontWeight="bold">
            {formatMessage({
              id: 'Settings.tokens.copy.title',
              defaultMessage: 'Token',
            })}
          </Typography>
          <Typography>
            {formatMessage({
              id: 'Settings.tokens.copy.lastWarning',
              defaultMessage: 'Make sure to copy this token, you won’t be able to see it again!',
            })}
          </Typography>
        </Flex>
        <Box background="neutral100" hasRadius padding={2} borderColor="neutral150">
          <TypographyWordBreak fontWeight="semiBold" variant="pi">
            {token}
          </TypographyWordBreak>
        </Box>
        <unstable_tours.apiTokens.CopyAPIToken>
          <Button
            startIcon={<Duplicate />}
            variant="secondary"
            onClick={handleClick(token)}
            marginTop={6}
          >
            {formatMessage({ id: 'Settings.tokens.copy.copy', defaultMessage: 'Copy' })}
          </Button>
        </unstable_tours.apiTokens.CopyAPIToken>
      </Flex>
    </>
  );
};

export const TokenBox = ({ token, tokenType }: TokenBoxProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();

  const { copy } = useClipboard();

  const handleClick = (token: TokenBoxProps['token']) => async () => {
    if (token) {
      const didCopy = await copy(token);

      if (didCopy) {
        trackUsage('didCopyTokenKey', {
          tokenType,
        });
        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'Settings.tokens.notification.copied' }),
        });
      }
    }
  };

  return (
    <ContentBox
      endAction={
        token && (
          <span style={{ alignSelf: 'start' }}>
            <IconButton
              label={formatMessage({
                id: 'app.component.CopyToClipboard.label',
                defaultMessage: 'Copy to clipboard',
              })}
              onClick={handleClick(token)}
              variant="ghost"
              type="button"
              style={{ padding: 0, height: '1.6rem' }}
            >
              <Duplicate />
            </IconButton>
          </span>
        )
      }
      title={
        token ||
        formatMessage({
          id: 'Settings.tokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        })
      }
      subtitle={
        token
          ? formatMessage(
              tokenType === 'api-token'
                ? {
                    id: 'Settings.tokens.copy.subtitle',
                    defaultMessage: 'Copy this token for use elsewhere',
                  }
                : {
                    id: 'Settings.tokens.copy.lastWarning',
                    defaultMessage:
                      'Make sure to copy this token, you won’t be able to see it again!',
                  }
            )
          : formatMessage({
              id: 'Settings.tokens.copy.editMessage',
              defaultMessage: 'For security reasons, you can only see your token once.',
            })
      }
      icon={<Key />}
      iconBackground="neutral100"
    />
  );
};
