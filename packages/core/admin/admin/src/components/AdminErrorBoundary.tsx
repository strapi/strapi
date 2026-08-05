import * as React from 'react';

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
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';

interface AdminErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
}

class AdminErrorBoundary extends React.Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[AdminErrorBoundary]', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      pathname: window.location.pathname,
    });
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error !== null) {
      return <ErrorFallback error={this.state.error} componentStack={this.state.componentStack} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  componentStack: string | null;
}

const ErrorFallback = ({ error, componentStack }: ErrorFallbackProps) => {
  const handleCopy = async () => {
    const text = [
      '```',
      error.stack ?? error.message,
      '```',
      componentStack !== null ? `\nComponent stack:\n${componentStack}` : '',
    ]
      .join('\n')
      .trim();

    await navigator.clipboard.writeText(text);
  };

  const trimmedStack =
    componentStack !== null ? componentStack.trim().split('\n').slice(0, 8).join('\n') : null;

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
              Something went wrong
            </Typography>
            <Typography variant="omega" textAlign="center">
              {`It seems like there is a bug in your instance, but we've got you covered. Please notify your technical team so they can investigate the source of the problem and report the issue to us by opening a bug report on `}
              <Link
                isExternal
                endIcon
                href="https://github.com/strapi/strapi/issues/new?assignees=&labels=&projects=&template=BUG_REPORT.md"
              >{`Strapi's GitHub`}</Link>
              .
            </Typography>
          </Flex>
          <Flex gap={4} direction="column" width="100%">
            <StyledAlert onClose={() => {}} width="100%" closeLabel="" variant="danger">
              <ErrorType>{error.message}</ErrorType>
            </StyledAlert>
            {trimmedStack !== null && (
              <StyledAlert onClose={() => {}} width="100%" closeLabel="" variant="default">
                <StackType>{trimmedStack}</StackType>
              </StyledAlert>
            )}
            <Flex gap={2}>
              <Button onClick={handleCopy} variant="tertiary" startIcon={<Duplicate />}>
                Copy to clipboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="secondary">
                Reload page
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Main>
  );
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

const StackType = styled<TypographyComponent>(Typography)`
  word-break: break-all;
  white-space: pre-wrap;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral600};
`;

export { AdminErrorBoundary };
