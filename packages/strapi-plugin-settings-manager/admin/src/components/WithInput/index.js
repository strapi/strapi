/**
*
* WithInput
*
*/

import React from 'react';
import styles from './styles.scss';

const WithInput = (InnerInput) => class extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <InnerInput
        {...this.props}
        {...this.state}
        styles={styles}
      />
    );
  }
}

export default WithInput;
