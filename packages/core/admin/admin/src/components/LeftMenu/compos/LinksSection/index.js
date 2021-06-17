import React from 'react';
import PropTypes from 'prop-types';
import LeftMenuLink from '../Link';
import LeftMenuListLink from './LeftMenuListLink';

const LeftMenuLinksSection = ({ links }) => {
  return (
    <>
      <LeftMenuListLink>
        {links.map(link => (
          <LeftMenuLink {...link} key={link.to} />
        ))}
      </LeftMenuListLink>
    </>
  );
};

LeftMenuLinksSection.propTypes = {
  links: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default LeftMenuLinksSection;
