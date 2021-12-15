import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import { useHistory } from 'react-router';
import React, { useCallback, useMemo } from 'react';

import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Layout } from '@strapi/design-system/Layout';

import Logo from '../../assets/images/homepage-logo.png';

const LogoContainer = styled(Box)`
  position: absolute;
  top: 0;
  right: 0;
  img {
    width: ${150 / 16}rem;
  }
`;

const ContentContainer = styled(Box)`
  flex-direction: column;
  position: absolute;
  max-width: 900px;
  min-width: unset;
  left: calc(50% - 450px);
  top: 34%;
`;

const ErrorCode = styled(Box)`
  font-size: 120px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  padding-bottom: 16px;
`;

const Subtitle = styled(Box)`
  font-size: 24px;
  color: rgba(0, 0, 0, 0.8);
  padding-bottom: 16px;
`;

const Description = styled(Box)`
  font-size: 22px;
  line-height: 32px;
  color: rgba(0, 0, 0, 0.6);
  padding-bottom: 16px;
`;

/**
 * NotFoundPage
 *
 * This is the page we show when the user visits a url that doesn't have a route
 *
 */
const NotFoundPage = () => {
  const history = useHistory();
  const { formatMessage } = useIntl();

  // page translations
  const { title, subtitle, action, message } = useMemo(
    () => ({
      title: formatMessage({
        id: 'app.components.NotFoundPage.description',
        defaultMessage: 'Not Found',
      }),
      subtitle: formatMessage({
        id: 'content-manager.pageNotFound',
        defaultMessage: 'Not Found',
      }),
      action: formatMessage({
        id: 'app.components.NotFoundPage.back',
        defaultMessage: 'Back',
      }),
      message: formatMessage({
        id: 'app.components.NotFoundPage.message',
        defaultMessage: '',
      }),
    }),
    [formatMessage]
  );

  // executed on primary action clicked
  const navigateHome = useCallback(() => {
    history.push('/');
  }, [history]);

  return (
    <Layout>
      <Helmet title={title} />
      <Box>
        <LogoContainer>
          <img alt="" aria-hidden src={Logo} />
        </LogoContainer>
        <ContentContainer>
          <Subtitle>{subtitle}</Subtitle>
          <ErrorCode>404</ErrorCode>
          <Description>{message}</Description>
          <Button onClick={navigateHome}>{action}</Button>
        </ContentContainer>
      </Box>
    </Layout>
  );
};

export default NotFoundPage;
