/**
 *
 * Policies
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, map, takeRight, toLower, without } from 'lodash';

import { InputsIndex as Input } from 'strapi-helper-plugin';
import BoundRoute from '../BoundRoute';

import { Header, Wrapper } from './Components';

class Policies extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  handleChange = e => this.context.onChange(e);

  render() {
    const baseTitle = 'users-permissions.Policies.header';
    const title = this.props.shouldDisplayPoliciesHint ? 'hint' : 'title';
    const value = get(this.props.values, this.props.inputSelectName);
    const path = without(
      this.props.inputSelectName.split('.'),
      'permissions',
      'controllers',
      'policy'
    );
    const controllerRoutes = get(
      this.props.routes,
      without(
        this.props.inputSelectName.split('.'),
        'permissions',
        'controllers',
        'policy'
      )[0]
    );
    const routes = isEmpty(controllerRoutes)
      ? []
      : controllerRoutes.filter(
          o => toLower(o.handler) === toLower(takeRight(path, 2).join('.'))
        );

    return (
      <Wrapper className="col-md-5">
        <div className="container-fluid">
          <div className="row">
            <Header className="col-md-12">
              <FormattedMessage id={`${baseTitle}.${title}`} />
            </Header>
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
            ) : (
              ''
            )}
          </div>
          <div className="row">
            {!this.props.shouldDisplayPoliciesHint
              ? map(routes, (route, key) => (
                  <BoundRoute key={key} route={route} />
                ))
              : ''}
          </div>
        </div>
      </Wrapper>
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
