/**
*
* EditForm
*
*/

import React from 'react';
import { map } from 'lodash';
import EditFormSection from 'components/EditFormSection';
import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.editForm}>
        <div className={styles.formContainer}>
          {map(this.props.sections, (section, key) => {
            let line;
            // display hr only if next section
            if (key + 1 < this.props.sections.length) {
              line = <hr />;
            }
            return (
              <div key={key}>
                <EditFormSection section={section} handleChange={this.props.handleChange} />
                {line}
              </div>
            )
          })}
        </div>
      </div>
    );
  }
}

EditForm.propTypes = {
  handleChange: React.PropTypes.func.isRequired,
  sections: React.PropTypes.array,
};

export default EditForm;
