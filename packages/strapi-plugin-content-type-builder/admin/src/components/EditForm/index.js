/**
*
* EditForm
*
*/

import React from 'react';
import { map } from 'lodash';
import Button from 'components/Button';
import EditFormSection from 'components/EditFormSection';
import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.editForm}>
        <form onSubmit={this.props.handleSubmit}>
          <div className={styles.formContainer}>
            {map(this.props.sections, (section, key) => {
              let line;
              // display hr only if next section
              if (key + 1 < this.props.sections.length) {
                line = <hr />;
              }
              return (
                <div key={key}>
                  <EditFormSection
                    section={section}
                    values={this.props.values}
                    handleChange={this.props.handleChange}
                  />
                  {line}
                </div>
              )
            })}
          </div>
          <div className={styles.buttonContainer}>
            <Button type="button" label={"cancel"} buttonSize={"buttonMd"} buttonBackground={"secondary"} onClick={this.props.handleCancel} />
            <Button type="submit" label={"save"} buttonSize={"buttonLg"} buttonBackground={"primary"} onClick={this.props.handleSubmit} />
          </div>
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {
  handleCancel: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  handleSubmit: React.PropTypes.func,
  sections: React.PropTypes.array,
  values: React.PropTypes.object,
};

export default EditForm;
