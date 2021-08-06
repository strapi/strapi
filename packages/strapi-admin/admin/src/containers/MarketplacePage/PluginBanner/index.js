import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, useIntl } from 'react-intl';
import Wrapper from './Wrapper';
import LogoStrapi from '../../../assets/images/banner_strapi-rocket.png';

const PluginBanner = ({ emitEvent }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper>
      <img
        className="bannerImage"
        src={LogoStrapi}
        alt={formatMessage({ id: 'app.components.PluginBanner.image.alt' })}
      />
      <div>
        <div>
          <FormattedMessage id="app.components.PluginBanner" />
        </div>
        <a
          href="https://github.com/strapi/awesome-strapi"
          target="_blank"
          rel="noopener noreferrer"
          className="bannerLink"
          onClick={() => emitEvent('didGoToStrapiAwesome')}
        >
          <FormattedMessage id="app.components.PluginBanner.link" />
          <i className="fa fa-external-link-alt" />
        </a>
      </div>
    </Wrapper>
  );
};

export default PluginBanner;

PluginBanner.propTypes = {
  emitEvent: PropTypes.func.isRequired,
};
