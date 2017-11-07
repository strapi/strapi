/**
*
* EditForm
*
*/

import React from 'react';

// Uncomment to use PropTypes
import Input from 'components/Input';
// import PropTypes from 'prop-types';

import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { value: false }

  handleChange = ({target}) => {
    this.setState({ value: target.value });
  }

  render() {
    return (
      <div className={styles.editForm}>
        <div className="row">
          <Input
            label="users-permissions.EditForm.inputToggle.label"
            inputDescription="users-permissions.EditForm.inputToggle.description"
            name="uniqueAccount"
            onChange={this.handleChange}
            type="toggle"
            value={this.state.value}
            validations={{}}
          />
        </div>
        <div className={styles.separator} />
        <div className="row">
          <Input
            customBootstrapClass="col-md-3"
            label="users-permissions.EditForm.inputSelect.subscriptions.label"
            inputDescription="users-permissions.EditForm.inputSelect.subscriptions.description"
            name="subscriptions"
            onChange={() => console.log('change')}
            type="select"
            value={'100'}
            selectOptions={[ { value: '100' }, { value: '200' }]}
            validations={{}}
          />
        <div className="col-md-3" />
          <Input
            customBootstrapClass="col-md-3"
            label="users-permissions.EditForm.inputSelect.durations.label"
            inputDescription="users-permissions.EditForm.inputSelect.durations.description"
            name="durations"
            onChange={() => console.log('change')}
            type="select"
            value={'24'}
            selectOptions={[ { value: '24' }, { value: '48' }]}
            validations={{}}
          />

        </div>
      </div>

    );
  }
}

// Uncomment to use PropTypes
// EditForm.proptypes = {
  // foo: PropTypes.string,
// };

export default EditForm;
