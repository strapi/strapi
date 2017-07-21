/**
*
* PopUpForm
*
*/

import React from 'react';

import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    console.log('fuck', this.props);
    return (
      <div className={styles.popUpForm}>
      </div>
    );
  }
}

export default PopUpForm;
