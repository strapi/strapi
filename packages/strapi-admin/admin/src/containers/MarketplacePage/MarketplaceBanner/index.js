import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useGlobalContext } from 'strapi-helper-plugin';
import Wrapper from './Wrapper';
import LogoStrapi from '../../../assets/images/banner_strapi-rocket.png';

const MarketplaceBanner = () => {
  const { formatMessage } = useIntl();
  const { emitEvent } = useGlobalContext();

  return (
    <Wrapper>
      <img
        className="bannerImage"
        src={LogoStrapi}
        alt={formatMessage({ id: 'app.components.MarketplaceBanner.image.alt' })}
      />
      <div>
        <div>
          <FormattedMessage id="app.components.MarketplaceBanner" />
        </div>
        <a
          href="https://github.com/strapi/awesome-strapi"
          target="_blank"
          rel="noopener noreferrer"
          className="bannerLink"
          onClick={() => emitEvent('didGoToStrapiAwesome')}
        >
          <FormattedMessage id="app.components.MarketplaceBanner.link" />
          <i className="fa fa-external-link-alt" />
        </a>
      </div>
    </Wrapper>
  );
};

export default MarketplaceBanner;
