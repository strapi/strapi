import React from 'react';
import PropTypes from 'prop-types';
import { Text, Row, Grid, GridItem } from '@strapi/parts';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const SSOButton = styled.a`
  width: ${136 / 16}rem;
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${48 / 16}rem;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: none;
`;

const SSOProvidersWrapper = styled(Row)`
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
    <SSOButton href={`${strapi.backendURL}/admin/connect/${provider.uid}`}>
      {provider.icon ? (
        <img src={provider.icon} alt={provider.displayName} height="32px" />
      ) : (
        <Text>{provider.displayName}</Text>
      )}
    </SSOButton>
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
          <SSOButton as={Link} to="/auth/providers">
            <span>•••</span>
          </SSOButton>
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
