/**
 *
 * SocialLink
 */

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';

import Gh from '../../assets/images/social_gh.png';
import Slack from '../../assets/images/social_slack.png';
import Medium from '../../assets/images/social_medium.png';
import So from '../../assets/images/social_so.png';
import Twitter from '../../assets/images/social_twitter.png';
import Reddit from '../../assets/images/social_reddit.png';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/alt-text */
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

class SocialLink extends React.PureComponent {
  state = { imgLoaded: false };

  handleImgLoaded = () => this.setState({ imgLoaded: true });

  render() {
    const { link, name } = this.props;
    const { imgLoaded } = this.state;

    return (
      <div className={cn(styles.socialLink, 'col-md-6 col-lg-6')}>
        <a href={link} target="_blank">
          <div>
            {!imgLoaded && (
              <div className={styles.spinner}>
                <div />
              </div>
            )}
            <img src={getSrc(name)} onLoad={this.handleImgLoaded} />
          </div>
          <span>{name}</span>
        </a>
      </div>
    );
  }
}

SocialLink.propTypes = {
  link: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default SocialLink;
