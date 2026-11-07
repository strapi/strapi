import * as React from 'react';

import { Alert, Box, Button, Flex, Main, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Link, useSearchParams } from 'react-router-dom';

import { PrivateRoute } from '../components/PrivateRoute';
import { Logo } from '../components/UnauthenticatedLogo';
import { useAuth } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { LayoutContent, UnauthenticatedLayout } from '../layouts/UnauthenticatedLayout';
import {
  useGetMcpOAuthAuthorizationRequestQuery,
  useSubmitMcpOAuthConsentMutation,
} from '../services/mcp';

const InvalidRequest = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" gap={4}>
      <Typography textAlign="center" variant="alpha" tag="h1" id="mcp-oauth-consent-title">
        {formatMessage({
          id: 'mcp.oauth.consent.invalid.title',
          defaultMessage: 'Invalid authorization request',
        })}
      </Typography>
      <Typography textAlign="center" variant="epsilon" textColor="neutral600" tag="p">
        {formatMessage({
          id: 'mcp.oauth.consent.invalid.message',
          defaultMessage:
            'This authorization request is invalid or has expired. Return to your MCP client and try connecting again.',
        })}
      </Typography>
      <Link to="/">
        {formatMessage({
          id: 'mcp.oauth.consent.invalid.home-link',
          defaultMessage: 'Go back to the homepage',
        })}
      </Link>
    </Flex>
  );
};

/**
 * What the consent screen shows as the return destination. Only https URIs are reduced
 * to their host: a custom scheme also parses a host (evilapp://claude.ai), so anything
 * else displays the full URI and is flagged as not being a secure https address.
 */
const getRedirectDisplay = (redirectUri: string, fallbackHost: string) => {
  try {
    const url = new URL(redirectUri);

    if (url.protocol === 'https:') {
      return { isHttps: true, display: url.host || fallbackHost };
    }

    return { isHttps: false, display: redirectUri };
  } catch {
    return { isHttps: false, display: fallbackHost };
  }
};

const OAuthConsentPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const user = useAuth('OAuthConsentPage', (state) => state.user);

  const ticket = searchParams.get('ticket');

  const {
    data: authorizationRequest,
    isLoading,
    error,
  } = useGetMcpOAuthAuthorizationRequestQuery({ ticket: ticket ?? '' }, { skip: ticket === null });

  const [submitConsent, { isLoading: isSubmitting }] = useSubmitMcpOAuthConsentMutation();

  const handleDecision = async (decision: 'approve' | 'deny') => {
    if (ticket === null) {
      return;
    }

    const res = await submitConsent({ ticket, decision });

    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'mcp.oauth.consent.error',
          defaultMessage: 'The authorization could not be completed. Try again.',
        }),
      });
      return;
    }

    setIsRedirecting(true);
    window.location.assign(res.data.redirectTo);
  };

  const displayName = user ? [user.firstname, user.lastname].filter(Boolean).join(' ') : '';

  let content: React.ReactNode = null;

  if (ticket === null || error) {
    content = <InvalidRequest />;
  } else if (isLoading || !authorizationRequest) {
    content = (
      <Typography textAlign="center" variant="epsilon" textColor="neutral600" tag="p">
        {formatMessage({
          id: 'mcp.oauth.consent.loading',
          defaultMessage: 'Loading the authorization request…',
        })}
      </Typography>
    );
  } else if (isRedirecting) {
    const { display } = getRedirectDisplay(
      authorizationRequest.redirectUri,
      authorizationRequest.redirectHost
    );

    content = (
      <Typography textAlign="center" variant="epsilon" textColor="neutral600" tag="p">
        {formatMessage(
          {
            id: 'mcp.oauth.consent.redirecting',
            defaultMessage: 'Taking you back to {host}…',
          },
          { host: display }
        )}
      </Typography>
    );
  } else {
    const { isHttps, display } = getRedirectDisplay(
      authorizationRequest.redirectUri,
      authorizationRequest.redirectHost
    );

    content = (
      <Flex direction="column" alignItems="stretch" gap={6}>
        {/* The title is fixed text: the client name is self-reported at registration, so it
            must never masquerade as a verified heading. */}
        <Typography textAlign="center" variant="alpha" tag="h1" id="mcp-oauth-consent-title">
          {formatMessage({
            id: 'mcp.oauth.consent.title',
            defaultMessage: 'Authorize MCP access to Strapi?',
          })}
        </Typography>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="epsilon" textColor="neutral600" tag="p">
            {formatMessage(
              {
                id: 'mcp.oauth.consent.client',
                defaultMessage:
                  'A client calling itself “{clientName}” is asking to use the MCP server with your permissions, as {user}.',
              },
              {
                clientName: authorizationRequest.client.name,
                user: displayName || user?.email || '',
              }
            )}
          </Typography>
          <Typography variant="epsilon" textColor="neutral600" tag="p">
            {formatMessage(
              {
                id: 'mcp.oauth.consent.redirect-notice',
                defaultMessage: 'After approval you will be sent back to {host}.',
              },
              { host: display }
            )}
          </Typography>
        </Flex>
        {!isHttps ? (
          <Alert
            variant="danger"
            closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
            onClose={() => {}}
          >
            {formatMessage(
              {
                id: 'mcp.oauth.consent.insecure-redirect',
                defaultMessage:
                  '{redirectUri} is not a secure https address. Only approve if you recognize it.',
              },
              { redirectUri: authorizationRequest.redirectUri }
            )}
          </Alert>
        ) : null}
        <Alert
          variant="default"
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
          onClose={() => {}}
        >
          {formatMessage({
            id: 'mcp.oauth.consent.security-note',
            defaultMessage: 'Only approve if you started this connection from a tool you trust.',
          })}
        </Alert>
        <Flex gap={2} justifyContent="center">
          <Button
            variant="tertiary"
            size="L"
            onClick={() => handleDecision('deny')}
            disabled={isSubmitting}
          >
            {formatMessage({ id: 'mcp.oauth.consent.deny', defaultMessage: 'Deny' })}
          </Button>
          <Button size="L" onClick={() => handleDecision('approve')} loading={isSubmitting}>
            {formatMessage({ id: 'mcp.oauth.consent.approve', defaultMessage: 'Approve' })}
          </Button>
        </Flex>
      </Flex>
    );
  }

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="mcp-oauth-consent-title">
        <LayoutContent>
          <Flex direction="column" paddingBottom={7}>
            <Logo />
          </Flex>
          <Box width="40rem" maxWidth="100%">
            {content}
          </Box>
        </LayoutContent>
      </Main>
    </UnauthenticatedLayout>
  );
};

const PrivateOAuthConsentPage = () => {
  return (
    <PrivateRoute>
      <OAuthConsentPage />
    </PrivateRoute>
  );
};

export { OAuthConsentPage, PrivateOAuthConsentPage };
