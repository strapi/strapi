import { Alert, Flex, Icon, Main, Typography } from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useRouteError } from 'react-router-dom';
import styled from 'styled-components';

/**
 * @description this stops the app from going white, and instead shows the error message.
 * But it could be improved for sure.
 */
const ErrorElement = () => {
  const error = useRouteError();
  const { formatMessage } = useIntl();

  const errorMsg =
    process.env.NODE_ENV === 'development'
      ? formatMessage({
          id: 'app.error.development',
          defaultMessage: 'This is likely a bug with Strapi. Please open an issue.',
        })
      : formatMessage({
          id: 'app.error.production',
          defaultMessage: 'Please contact your administrator.',
        });

  if (error instanceof Error) {
    console.error(error);

    return (
      <Main height="100%">
        <Flex alignItems="center" height="100%" justifyContent="center">
          <Flex
            gap={7}
            padding={7}
            direction="column"
            width="35%"
            shadow="tableShadow"
            borderColor="neutral150"
            background="neutral0"
            hasRadius
          >
            <Flex direction="column" gap={2}>
              <Icon as={ExclamationMarkCircle} width="32px" height="32px" color="danger600" />
              <Typography fontSize={4} fontWeight="bold">
                {formatMessage({
                  id: 'app.error',
                  defaultMessage: 'Your app crashed',
                })}
              </Typography>
              <Typography variant="omega" textAlign="center">
                {errorMsg}
              </Typography>
            </Flex>
            {/* the Alert component needs to make its close button optional. */}
            <StyledAlert
              title={error.name !== 'Error' ? error.name : ''}
              onClose={() => {}}
              closeLabel=""
              variant="danger"
            >
              <ErrorType>{error.message}</ErrorType>
            </StyledAlert>
          </Flex>
        </Flex>
      </Main>
    );
  }

  throw error;
};

const StyledAlert = styled(Alert)`
  & > button {
    display: none;
  }
`;

const ErrorType = styled(Typography)`
  word-break: break-all;
`;

export { ErrorElement };
