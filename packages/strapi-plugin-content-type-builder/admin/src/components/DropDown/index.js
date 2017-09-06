/**
*
* DropDown
*
*/

import React from 'react';
import Shape from '../../assets/images/dropdow_shape.svg';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

class DropDown extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleClick = () => {
    console.log('click');
  }
  
  render() {
    return (
      <div className={styles.dropDown}>
        <img src={Shape} role="presentation" onClick={this.handleClick} />
      </div>
    );
  }
}

export default DropDown;
