/**
*
* RightContentTitle
*
*/

import React from 'react';

import styles from './styles.scss';

class RightContentTitle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.rightContentTitle}>
        <h2 className={styles.rightContentTitleName}>{this.props.title}</h2>
        <p className={styles.rightContentTitleDescription}>{this.props.description}</p>
        <hr className={styles.rightContentTitleSeparator}></hr>
      </div>
    );
  }
}

RightContentTitle.propTypes = {
  title: React.PropTypes.string,
  description: React.PropTypes.string,
};

export default RightContentTitle;
