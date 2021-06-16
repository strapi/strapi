import React from 'react';
import PropTypes from 'prop-types';
import LeftMenuLink from '../Link';
import LeftMenuListLink from './LeftMenuListLink';

const LeftMenuLinksSection = ({ location, links }) => {
  return (
    <>
      <LeftMenuListLink>
        {links.map(link => (
          <LeftMenuLink
            location={location}
            key={link.destination}
            iconName={link.icon}
            label={link.label}
            destination={link.destination}
            notificationsCount={link.notificationsCount || 0}
            search={link.search}
          />
        ))}
      </LeftMenuListLink>
    </>
  );
};

LeftMenuLinksSection.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  links: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default LeftMenuLinksSection;
