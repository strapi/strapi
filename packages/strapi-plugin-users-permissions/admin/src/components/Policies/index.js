/**
*
* Policies
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

class Policies extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const baseTitle = 'users-permissions.Policies.header';
    const title = this.props.shouldDisplayPoliciesHint ? 'hint' : 'title';
    return (
      <div className={cn('col-md-5',styles.policies)}>
        <div className="container-fluid">
          <div className="row">
            <div className={cn('col-md-12', styles.header)}>
              <FormattedMessage id={`${baseTitle}.${title}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Policies.propTypes = {
  shouldDisplayPoliciesHint: PropTypes.bool.isRequired,
};

export default Policies;
