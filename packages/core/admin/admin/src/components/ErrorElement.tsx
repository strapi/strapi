import {
  Alert,
  Button,
  Flex,
  Main,
  Typography,
  Link,
  TypographyComponent,
} from '@strapi/design-system';
import { Duplicate, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useRouteError } from 'react-router-dom';
import { styled } from 'styled-components';

import { useClipboard } from '../hooks/useClipboard';

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

    const handleClick = async () => {
      await copy(`
\`\`\`
${error.stack}
\`\`\`
      `);
    };

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
            maxWidth="512px"
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
              <Button onClick={handleClick} variant="tertiary" startIcon={<Duplicate />}>
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

export { ErrorElement };
