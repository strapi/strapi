/**
*
* EditForm
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';
import EditFormSection from 'components/EditFormSection';
import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const buttonStyle = this.props.showLoader ? { display: 'none' } : {};
    return (
      <div className={styles.editForm}>
        <form onSubmit={this.props.handleSubmit} autoComplete="nope">
          <div className={styles.formContainer}>
            {map(this.props.sections, (section, key) => {
              let line;
              // display hr only if next section
              if (key + 1 < this.props.sections.length) {
                line = <hr />;
              }
              return (
                <div key={key} className={styles.sectionContainer}>
                  <EditFormSection
                    section={section}
                    values={this.props.values}
                    handleChange={this.props.handleChange}
                    cancelAction={this.props.cancelAction}
                    formErrors={this.props.formErrors}
                  />
                  {line}
                </div>
              )
            })}
          </div>
          <div className={styles.buttonContainer}>
            <FormattedMessage id="settings-manager.form.button.cancel">
              {(message) => (
                <Button type="button" label={message} buttonSize={"buttonMd"} buttonBackground={"secondary"} onClick={this.props.handleCancel} style={buttonStyle} />
              )}
            </FormattedMessage>
            <FormattedMessage id="settings-manager.form.button.save">
              {(message) => (
                <Button type="submit" loader={this.props.showLoader} label={message} buttonSize={"buttonLg"} buttonBackground={"primary"} onClick={this.props.handleSubmit} />
              )}
            </FormattedMessage>
          </div>
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {
  cancelAction: PropTypes.bool,
  formErrors: PropTypes.array,
  handleCancel: PropTypes.func,
  handleChange: PropTypes.func,
  handleSubmit: PropTypes.func,
  sections: PropTypes.array,
  showLoader: PropTypes.bool,
  values: PropTypes.object,
};

export default EditForm;
