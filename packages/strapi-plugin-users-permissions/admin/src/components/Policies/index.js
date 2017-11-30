/**
*
* Policies
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';

import Input from 'components/Input';

import styles from './styles.scss';

class Policies extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleChange = (e) => this.context.onChange(e);

  render() {
    const baseTitle = 'users-permissions.Policies.header';
    const title = this.props.shouldDisplayPoliciesHint ? 'hint' : 'title';
    const value = get(this.props.values, this.props.inputSelectName);

    return (
      <div className={cn('col-md-5',styles.policies)}>
        <div className="container-fluid">
          <div className="row">
            <div className={cn('col-md-12', styles.header)}>
              <FormattedMessage id={`${baseTitle}.${title}`} />
            </div>
            {!this.props.shouldDisplayPoliciesHint ? (
              <Input
                customBootstrapClass="col-md-12"
                label="users-permissions.Policies.InputSelect.empty"
                name={this.props.inputSelectName}
                onChange={this.handleChange}
                selectOptions={this.props.selectOptions}
                type="select"
                validations={{}}
                value={value}
              />
            ) : ''}
          </div>
        </div>
      </div>
    );
  }
}

Policies.contextTypes = {
  onChange: PropTypes.func.isRequired,
};

Policies.propTypes = {
  inputSelectName: PropTypes.string.isRequired,
  selectOptions: PropTypes.array.isRequired,
  shouldDisplayPoliciesHint: PropTypes.bool.isRequired,
  values: PropTypes.object.isRequired,
};

export default Policies;
