import * as React from 'react';

import { Button, Flex, LinkButton, Typography } from '@strapi/design-system';
import { CheckCircle } from '@strapi/icons';
import { CodeSquare, GlassesSquare, PlaySquare } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { getTranslation } from '../utils/getTranslation';

import { ContentBox } from './ContentBox';

const MarketingPresentation = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="row" gap={4} alignItems="flex-start">
      <Flex width="65%" gap={4} direction="column" alignItems="stretch">
        <ContentBox
          title={formatMessage({
            id: getTranslation('pages.home.features.tools-title'),
            defaultMessage: 'Get Everything You Need to Run Strapi in Production',
          })}
          subtitle={formatMessage({
            id: getTranslation('pages.home.features.tools-description'),
            defaultMessage:
              'Get a database, email provider, and CDN without having to manage it all yourself.',
          })}
          icon={<CodeSquare />}
          iconBackground="warning100"
        />
        <ContentBox
          title={formatMessage({
            id: getTranslation('pages.home.features.deploy-title'),
            defaultMessage: 'Deploy Strapi to Production in Just a Few Clicks',
          })}
          subtitle={formatMessage({
            id: getTranslation('pages.home.features.deploy-description'),
            defaultMessage:
              'Connect your repository, choose your region, and get started with generous usage limits.',
          })}
          icon={<PlaySquare />}
          iconBackground="secondary100"
        />
        <ContentBox
          title={formatMessage({
            id: getTranslation('pages.home.features.control-title'),
            defaultMessage: 'Remain in Complete Control',
          })}
          subtitle={formatMessage({
            id: getTranslation('pages.home.features.control-description'),
            defaultMessage: 'No lock-in. You remain in control of your stack and the tools you use',
          })}
          icon={<GlassesSquare />}
          iconBackground="alternative100"
        />
      </Flex>
      <Flex
        direction="column"
        alignItems="stretch"
        background="neutral0"
        shadow="tableShadow"
        flex={1}
        padding={4}
        gap={6}
        hasRadius
      >
        <Flex direction="row" justifyContent="space-between">
          <Flex direction="column" gap={1} alignItems="flex-start">
            <Typography variant="omega" fontWeight="bold">
              Developer plan
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              Best suited for <b>small projects</b>
            </Typography>
          </Flex>
          <p>
            <Typography variant="beta">USD 29</Typography>
            <Typography variant="pi">/month</Typography>
          </p>
        </Flex>
        <Flex direction="column" gap={3} alignItems="flex-start">
          {[
            '10 CMS seats',
            '1 admin user',
            '1GB of database storage',
            '150GB of assets storage',
            '500 GB of assets bandwidth',
          ].map((feature, index) => (
            <Flex direction="row" gap={2} key={index}>
              <CheckCircle fill="success600" />
              <Typography variant="omega">{feature}</Typography>
            </Flex>
          ))}
        </Flex>
        <Flex direction="row" gap={3}>
          <Button>Start free trial</Button>
          <LinkButton variant="secondary" tag={Link} to="https://strapi.io/pricing-cloud">
            View pricing plans
          </LinkButton>
        </Flex>
      </Flex>
    </Flex>
  );
};

export { MarketingPresentation };
