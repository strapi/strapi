import {
  Alert,
  Button,
  Flex,
  Main,
  Typography,
  Link,
  TypographyComponent,
} from '@strapi/design-system';
import { Clock, Duplicate, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useRouteError } from 'react-router-dom';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';
import { useClipboard } from '../hooks/useClipboard';
import { isChunkLoadError } from '../utils/retryDynamicImport';

/**
 * @description this stops the app from going white, and instead shows the error message.
 * But it could be improved for sure.
 */
const ErrorElement = () => {
  const error = useRouteError();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  if (error instanceof Error) {
    console.error(error);

    const handleCopy = async () => {
      await copy(`
\`\`\`
${error.stack}
\`\`\`
      `);
    };

    if (isChunkLoadError(error)) {
      return (
        <Main height="100%">
          <Flex
            alignItems="center"
            height="100%"
            justifyContent="center"
            paddingLeft={RESPONSIVE_DEFAULT_SPACING}
            paddingRight={RESPONSIVE_DEFAULT_SPACING}
          >
            <Flex
              gap={7}
              padding={{
                initial: 6,
                small: 7,
                medium: 8,
              }}
              direction="column"
              width="100%"
              maxWidth="512px"
              shadow="tableShadow"
              borderColor="neutral150"
              background="neutral0"
              hasRadius
            >
              <Flex direction="column" gap={2}>
                <Clock width="32px" height="32px" fill="primary600" />
                <Typography fontSize={4} fontWeight="bold" textAlign="center">
                  {formatMessage({
                    id: 'app.error.chunk.title',
                    defaultMessage: 'Taking longer than expected',
                  })}
                </Typography>
                <Typography variant="omega" textAlign="center">
                  {formatMessage({
                    id: 'app.error.chunk.message',
                    defaultMessage:
                      'The admin could not load a screen. This often happens when the server is starting or the connection was interrupted. Reload the page to try again. If you recently deployed, you may need a full refresh to load the latest version.',
                  })}
                </Typography>
              </Flex>
              <Flex gap={4} direction="column" width="100%">
                <Button onClick={() => window.location.reload()} fullWidth>
                  {formatMessage({
                    id: 'app.error.chunk.reload',
                    defaultMessage: 'Reload the page',
                  })}
                </Button>
                <StyledAlert onClose={() => {}} width="100%" closeLabel="" variant="warning">
                  <ChunkErrorType>{error.message}</ChunkErrorType>
                </StyledAlert>
                <Button onClick={handleCopy} variant="tertiary" startIcon={<Duplicate />}>
                  {formatMessage({
                    id: 'app.error.copy',
                    defaultMessage: 'Copy to clipboard',
                  })}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Main>
      );
    }

    return (
      <Main height="100%">
        <Flex
          alignItems="center"
          height="100%"
          justifyContent="center"
          paddingLeft={RESPONSIVE_DEFAULT_SPACING}
          paddingRight={RESPONSIVE_DEFAULT_SPACING}
        >
          <Flex
            gap={7}
            padding={{
              initial: 6,
              small: 7,
              medium: 8,
            }}
            direction="column"
            width="100%"
            maxWidth="512px"
            shadow="tableShadow"
            borderColor="neutral150"
            background="neutral0"
            hasRadius
          >
            <Flex direction="column" gap={2}>
              <WarningCircle width="32px" height="32px" fill="danger600" />
              <Typography fontSize={4} fontWeight="bold" textAlign="center">
                {formatMessage({
                  id: 'app.error',
                  defaultMessage: 'Something went wrong',
                })}
              </Typography>
              <Typography variant="omega" textAlign="center">
                {formatMessage(
                  {
                    id: 'app.error.message',
                    defaultMessage: `It seems like there is a bug in your instance, but we've got you covered. Please notify your technical team so they can investigate the source of the problem and report the issue to us by opening a bug report on {link}.`,
                  },
                  {
                    link: (
                      <Link
                        isExternal
                        // hack to get rid of the current endIcon, which should be removable by using `null`.
                        endIcon
                        href="https://github.com/strapi/strapi/issues/new?assignees=&labels=&projects=&template=BUG_REPORT.md"
                      >{`Strapi's GitHub`}</Link>
                    ),
                  }
                )}
              </Typography>
            </Flex>
            {/* the Alert component needs to make its close button optional as well as the icon. */}
            <Flex gap={4} direction="column" width="100%">
              <StyledAlert onClose={() => {}} width="100%" closeLabel="" variant="danger">
                <ErrorType>{error.message}</ErrorType>
              </StyledAlert>
              <Button onClick={handleCopy} variant="tertiary" startIcon={<Duplicate />}>
                {formatMessage({
                  id: 'app.error.copy',
                  defaultMessage: 'Copy to clipboard',
                })}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Main>
    );
  }

  throw error;
};

const StyledAlert = styled(Alert)`
  & > div:first-child {
    display: none;
  }

  & > button {
    display: none;
  }
`;

const ErrorType = styled<TypographyComponent>(Typography)`
  word-break: break-all;
  color: ${({ theme }) => theme.colors.danger600};
`;

const ChunkErrorType = styled<TypographyComponent>(Typography)`
  word-break: break-all;
  color: ${({ theme }) => theme.colors.warning600};
`;

export { ErrorElement };
