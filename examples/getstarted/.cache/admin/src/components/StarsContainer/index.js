/*
*
* StarsContainer
*
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map, times } from 'lodash';
import styles from './styles.scss';

function StarsContainer({ ratings }) {
  const stars = Math.round(ratings);
  const coloredStars = times(stars, String);
  const emptyStars = times(5 - stars, String);

  return (
    <div className={styles.starsContainer}>
      <div>
        {map(coloredStars, star => <i key={star} className="fa fa-star" />)}
      </div>
      <div>
        {map(emptyStars, s => <i key={s} className="fa fa-star" />)}
      </div>
    </div>
  );
}

StarsContainer.defaultProps = {
  ratings: 5,
};

StarsContainer.propTypes = {
  ratings: PropTypes.number,
};

export default StarsContainer;
