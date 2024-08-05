import { Flex, Grid, Tooltip, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import { GetProviders } from '../../../../../../shared/contracts/providers';

/* -------------------------------------------------------------------------------------------------
 * SSOProviders
 * -----------------------------------------------------------------------------------------------*/

interface SSOProvidersProps {
  providers: GetProviders.Response;
  displayAllProviders?: boolean;
}

const SSOProviders = ({ providers, displayAllProviders }: SSOProvidersProps) => {
  const { formatMessage } = useIntl();

  if (displayAllProviders) {
    return (
      <Grid.Root gap={4}>
        {providers.map((provider) => (
          <Grid.Item key={provider.uid} col={4} direction="column" alignItems="stretch">
            <SSOProviderButton provider={provider} />
          </Grid.Item>
        ))}
      </Grid.Root>
    );
  }

  if (providers.length > 2 && !displayAllProviders) {
    return (
      <Grid.Root gap={4}>
        {providers.slice(0, 2).map((provider) => (
          <Grid.Item key={provider.uid} col={4} direction="column" alignItems="stretch">
            <SSOProviderButton provider={provider} />
          </Grid.Item>
        ))}
        <Grid.Item col={4} direction="column" alignItems="stretch">
          <Tooltip
            label={formatMessage({
              id: 'global.see-more',
            })}
          >
            <SSOButton as={Link} to="/auth/providers">
              <span aria-hidden>•••</span>
            </SSOButton>
          </Tooltip>
        </Grid.Item>
      </Grid.Root>
    );
  }

  return (
    <SSOProvidersWrapper justifyContent="center">
      {providers.map((provider) => (
        <SSOProviderButton key={provider.uid} provider={provider} />
      ))}
    </SSOProvidersWrapper>
  );
};

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

/* -------------------------------------------------------------------------------------------------
 * SSOProviderButton
 * -----------------------------------------------------------------------------------------------*/

interface SSOProviderButtonProps {
  provider: GetProviders.Response[number];
}

const SSOProviderButton = ({ provider }: SSOProviderButtonProps) => {
  return (
    <Tooltip label={provider.displayName}>
      <SSOButton href={`${window.strapi.backendURL}/admin/connect/${provider.uid}`}>
        {provider.icon ? (
          <img src={provider.icon} aria-hidden alt="" height="32px" />
        ) : (
          <Typography>{provider.displayName}</Typography>
        )}
      </SSOButton>
    </Tooltip>
  );
};

const SSOButton = styled.a`
  width: 13.6rem;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 4.8rem;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: inherit;
  &:link {
    text-decoration: none;
  }
  color: ${({ theme }) => theme.colors.neutral600};
`;

export { SSOProviders };
export type { SSOProvidersProps };
