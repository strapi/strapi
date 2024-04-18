import { Box, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useConfiguration } from '../../features/Configuration';

const BrandIconWrapper = styled(Box)`
  svg,
  img {
    border-radius: ${({ theme }) => theme.borderRadius};
    object-fit: contain;
    height: ${24 / 16}rem;
    width: ${24 / 16}rem;
    margin: ${3 / 16}rem;
  }
`;

export const NavBrand = () => {
  const { formatMessage } = useIntl();
  const {
    logos: { menu },
  } = useConfiguration('LeftMenu');
  return (
    <Box padding={3}>
      <BrandIconWrapper>
        <img
          src={menu.custom?.url || menu.default}
          alt={formatMessage({
            id: 'app.components.LeftMenu.logo.alt',
            defaultMessage: 'Application logo',
          })}
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
