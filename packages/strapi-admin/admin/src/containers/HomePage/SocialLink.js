/**
 *
 * SocialLink
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';

import Gh from '../../assets/images/social_gh.png';
import Slack from '../../assets/images/social_slack.png';
import Medium from '../../assets/images/social_medium.png';
import So from '../../assets/images/social_so.png';
import Twitter from '../../assets/images/social_twitter.png';
import Reddit from '../../assets/images/social_reddit.png';

import { SocialLinkWrapper } from './components';

function getSrc(name) {
  switch (name) {
    case 'GitHub':
      return Gh;
    case 'Reddit':
      return Reddit;
    case 'Medium':
      return Medium;
    case 'Slack':
      return Slack;
    case 'Stack Overflow':
      return So;
    case 'Twitter':
      return Twitter;
    default:
      return Gh;
  }
}

const SocialLink = ({ link, name }) => {
  return (
    <SocialLinkWrapper className="col-6">
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img src={getSrc(name)} alt={name} />
        <span>{name}</span>
      </a>
    </SocialLinkWrapper>
  );
};

SocialLink.propTypes = {
  link: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default memo(SocialLink);
