import { Box, Flex, type FlexComponent, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useConfiguration } from '../../features/Configuration';

const BrandIconWrapper = styled<FlexComponent>(Flex)`
  svg,
  img {
    border-radius: ${({ theme }) => theme.borderRadius};
    object-fit: contain;
    height: 2.4rem;
    width: 2.4rem;
  }
`;

export const NavBrand = () => {
  const { formatMessage } = useIntl();
  const {
    logos: { menu },
  } = useConfiguration('LeftMenu');
  return (
    <Box padding={3}>
      <BrandIconWrapper direction="column" justifyContent="center" width="3.2rem" height="3.2rem">
        <img
          src={menu.custom?.url || menu.default}
          alt={formatMessage({
            id: 'app.components.LeftMenu.logo.alt',
            defaultMessage: 'Application logo',
          })}
          width="100%"
          height="100%"
        />
        <VisuallyHidden>
          <span>
            {formatMessage({
              id: 'app.components.LeftMenu.navbrand.title',
              defaultMessage: 'Strapi Dashboard',
            })}
          </span>
          <span>
            {formatMessage({
              id: 'app.components.LeftMenu.navbrand.workplace',
              defaultMessage: 'Workplace',
            })}
          </span>
        </VisuallyHidden>
      </BrandIconWrapper>
    </Box>
  );
};
