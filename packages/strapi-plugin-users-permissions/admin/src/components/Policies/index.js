/**
*
* Policies
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, map, takeRight, toLower, without } from 'lodash';

import Input from 'components/InputsIndex';
import BoundRoute from '../BoundRoute';

import styles from './styles.scss';

class Policies extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleChange = (e) => this.context.onChange(e);

  render() {
    const baseTitle = 'users-permissions.Policies.header';
    const title = this.props.shouldDisplayPoliciesHint ? 'hint' : 'title';
    const value = get(this.props.values, this.props.inputSelectName);
    const path = without(this.props.inputSelectName.split('.'), 'permissions', 'controllers', 'policy');
    const controllerRoutes = get(this.props.routes, without(this.props.inputSelectName.split('.'), 'permissions', 'controllers', 'policy')[0]);
    const routes = isEmpty(controllerRoutes) ? [] : controllerRoutes.filter(o => toLower(o.handler) === toLower(takeRight(path, 2).join('.')));

    return (
      <div className={cn('col-md-5',styles.policies)}>
        <div className="container-fluid">
          <div className={cn('row', styles.inputWrapper)}>
            <div className={cn('col-md-12', styles.header)}>
              <FormattedMessage id={`${baseTitle}.${title}`} />
            </div>
            {!this.props.shouldDisplayPoliciesHint ? (
              <Input
                customBootstrapClass="col-md-12"
                label={{ id: 'users-permissions.Policies.InputSelect.label' }}
                name={this.props.inputSelectName}
                onChange={this.handleChange}
                selectOptions={this.props.selectOptions}
                type="select"
                validations={{}}
                value={value}
              />
            ) : ''}
          </div>
          <div className="row">
            {!this.props.shouldDisplayPoliciesHint ? (
              map(routes, (route, key) => <BoundRoute key={key} route={route} />)
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

Policies.defaultProps = {
  routes: {},
};

Policies.propTypes = {
  inputSelectName: PropTypes.string.isRequired,
  routes: PropTypes.object,
  selectOptions: PropTypes.array.isRequired,
  shouldDisplayPoliciesHint: PropTypes.bool.isRequired,
  values: PropTypes.object.isRequired,
};

export default Policies;
