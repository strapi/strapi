/**
*
* PopUpForm
*
*/

import React from 'react';


import styles from './styles.scss';

function PopUpForm() {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
    };
  }
  return (
    <div className={styles.popUpForm}>
    </div>
  );
}

export default PopUpForm;
