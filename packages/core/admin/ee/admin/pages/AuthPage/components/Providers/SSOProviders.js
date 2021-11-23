import React from 'react';
import PropTypes from 'prop-types';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Tooltip } from '@strapi/design-system/Tooltip';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

const SSOButton = styled.a`
  width: ${136 / 16}rem;
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${48 / 16}rem;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: inherit;
  &:link {
    text-decoration: none;
  }
  color: ${({ theme }) => theme.colors.neutral600};
`;

const SSOProvidersWrapper = styled(Flex)`
  & a:not(:first-child):not(:last-child) {
    margin: 0 ${({ theme }) => theme.spaces[2]};
  }
  & a:first-child {
    margin-right: ${({ theme }) => theme.spaces[2]};
  }
  & a:last-child {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }
`;

const SSOProviderButton = ({ provider }) => {
  return (
    <Tooltip label={provider.displayName}>
      <SSOButton href={`${strapi.backendURL}/admin/connect/${provider.uid}`}>
        {provider.icon ? (
          <img src={provider.icon} aria-hidden alt="" height="32px" />
        ) : (
          <Typography>{provider.displayName}</Typography>
        )}
      </SSOButton>
    </Tooltip>
  );
};

SSOProviderButton.propTypes = {
  provider: PropTypes.shape({
    icon: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
  }).isRequired,
};

const SSOProviders = ({ providers, displayAllProviders }) => {
  const { formatMessage } = useIntl();

  if (displayAllProviders) {
    return (
      <Grid gap={4}>
        {providers.map(provider => (
          <GridItem key={provider.uid} col={4}>
            <SSOProviderButton provider={provider} />
          </GridItem>
        ))}
      </Grid>
    );
  }

  if (providers.length > 2 && !displayAllProviders) {
    return (
      <Grid gap={4}>
        {providers.slice(0, 2).map(provider => (
          <GridItem key={provider.uid} col={4}>
            <SSOProviderButton provider={provider} />
          </GridItem>
        ))}
        <GridItem col={4}>
          <Tooltip
            label={formatMessage({
              id: 'Auth.form.button.login.providers.see-more',
            })}
          >
            <SSOButton as={Link} to="/auth/providers">
              <span aria-hidden>•••</span>
            </SSOButton>
          </Tooltip>
        </GridItem>
      </Grid>
    );
  }

  return (
    <SSOProvidersWrapper justifyContent="center">
      {providers.map(provider => (
        <SSOProviderButton key={provider.uid} provider={provider} />
      ))}
    </SSOProvidersWrapper>
  );
};

SSOProviders.defaultProps = {
  displayAllProviders: true,
};

SSOProviders.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.object).isRequired,
  displayAllProviders: PropTypes.bool,
};

export default SSOProviders;
