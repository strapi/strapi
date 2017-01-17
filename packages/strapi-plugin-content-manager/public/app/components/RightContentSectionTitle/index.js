/**
*
* RightContentSectionTitle
*
*/

import React from 'react';

import styles from './styles.scss';

class RightContentSectionTitle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div>
        <h3 className={styles.rightContentSectionTitle}>{this.props.title}</h3>
        <p className={styles.rightContentSectionSubTitle}>{this.props.description}</p>
      </div>
    );
  }
}

RightContentSectionTitle.propTypes = {
  title: React.PropTypes.string,
  description: React.PropTypes.string,
};

export default RightContentSectionTitle;
