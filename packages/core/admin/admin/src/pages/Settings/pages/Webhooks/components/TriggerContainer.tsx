import { Box, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Check, Cross, Loader } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled, { DefaultTheme, css } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * TriggerContainer
 * -----------------------------------------------------------------------------------------------*/

interface TriggerContainerProps extends Pick<StatusProps, 'isPending'> {
  onCancel: () => void;
  response?: {
    statusCode: number;
    message?: string;
  };
}

const TriggerContainer = ({ isPending, onCancel, response }: TriggerContainerProps) => {
  const { statusCode, message } = response ?? {};
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral0" padding={5} shadow="filterShadow" hasRadius>
      <Grid gap={4} style={{ alignItems: 'center' }}>
        <GridItem col={3}>
          <Typography>
            {formatMessage({
              id: 'Settings.webhooks.trigger.test',
              defaultMessage: 'Test-trigger',
            })}
          </Typography>
        </GridItem>
        <GridItem col={3}>
          <Status isPending={isPending} statusCode={statusCode} />
        </GridItem>
        <GridItem col={6}>
          {!isPending ? (
            <Message statusCode={statusCode} message={message} />
          ) : (
            <Flex justifyContent="flex-end">
              <button onClick={onCancel} type="button">
                <Flex gap={2} alignItems="center">
                  <Typography textColor="neutral400">
                    {formatMessage({
                      id: 'Settings.webhooks.trigger.cancel',
                      defaultMessage: 'cancel',
                    })}
                  </Typography>
                  <Icon as={Cross} color="neutral400" />
                </Flex>
              </button>
            </Flex>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
};

const Icon = styled.svg<{ color?: keyof DefaultTheme['colors'] }>(
  ({ theme, color }) => `
  width: ${12 / 16}rem;
  height: ${12 / 16}rem;


  ${
    color
      ? css`
          path {
            fill: ${theme.colors[color]};
          }
        `
      : ''
  }
`
);

/* -------------------------------------------------------------------------------------------------
 * Status
 * -----------------------------------------------------------------------------------------------*/

interface StatusProps {
  isPending: boolean;
  statusCode?: number;
}

const Status = ({ isPending, statusCode }: StatusProps) => {
  const { formatMessage } = useIntl();

  if (isPending || !statusCode) {
    return (
      <Flex gap={2} alignItems="center">
        <Icon as={Loader} />
        <Typography>
          {formatMessage({ id: 'Settings.webhooks.trigger.pending', defaultMessage: 'pending' })}
        </Typography>
      </Flex>
    );
  }

  if (statusCode >= 200 && statusCode < 300) {
    return (
      <Flex gap={2} alignItems="center">
        <Icon as={Check} color="success700" />
        <Typography>
          {formatMessage({ id: 'Settings.webhooks.trigger.success', defaultMessage: 'success' })}
        </Typography>
      </Flex>
    );
  }

  if (statusCode >= 300) {
    return (
      <Flex gap={2} alignItems="center">
        <Icon as={Cross} color="danger700" />
        <Typography>
          {formatMessage({ id: 'Settings.error', defaultMessage: 'error' })} {statusCode}
        </Typography>
      </Flex>
    );
  }

  return null;
};

/* -------------------------------------------------------------------------------------------------
 * Message
 * -----------------------------------------------------------------------------------------------*/

interface MessageProps {
  statusCode?: number;
  message?: string;
}

const Message = ({ statusCode, message }: MessageProps) => {
  const { formatMessage } = useIntl();

  if (!statusCode) {
    return null;
  }

  if (statusCode >= 200 && statusCode < 300) {
    return (
      <Flex justifyContent="flex-end">
        <Typography textColor="neutral600" ellipsis>
          {formatMessage({
            id: 'Settings.webhooks.trigger.success.label',
            defaultMessage: 'Trigger succeeded',
          })}
        </Typography>
      </Flex>
    );
  }

  if (statusCode >= 300) {
    return (
      <Flex justifyContent="flex-end">
        <Flex maxWidth={pxToRem(250)} justifyContent="flex-end" title={message}>
          <Typography ellipsis textColor="neutral600">
            {message}
          </Typography>
        </Flex>
      </Flex>
    );
  }

  return null;
};

export { TriggerContainer };
