/**
*
* EditFormSection
*
*/

import React from 'react';

import styles from './styles.scss';

class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.editFormSection}>
        <span>
          {this.props.section.name}
        </span>
        
      </div>
    );
  }
}

export default EditFormSection;
