import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { LayoutIcon, useTracking } from '@strapi/helper-plugin';
import { FormattedMessage } from 'react-intl';
import Link from './StyledLink';
import Wrapper from './Wrapper';

const ConfigureLink = ({ slug }) => {
  const { trackUsage } = useTracking();

  const handleClick = () => {
    trackUsage('willEditListLayout');
  };

  return (
    <Wrapper>
      <Link to={`${slug}/configurations/list`} onClick={handleClick}>
        <LayoutIcon />
        <FormattedMessage id="app.links.configure-view" />
      </Link>
    </Wrapper>
  );
};

ConfigureLink.propTypes = {
  slug: PropTypes.string.isRequired,
};

export default memo(ConfigureLink);
