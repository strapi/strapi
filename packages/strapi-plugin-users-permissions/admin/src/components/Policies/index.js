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
import { useEditPageContext } from '../../contexts/EditPage';
import { Header, Wrapper } from './Components';

const Policies = ({
  inputSelectName,
  routes,
  selectOptions,
  shouldDisplayPoliciesHint,
  values,
}) => {
  const { onChange } = useEditPageContext();
  const baseTitle = 'users-permissions.Policies.header';
  const title = shouldDisplayPoliciesHint ? 'hint' : 'title';
  const value = get(values, inputSelectName);
  const path = without(
    inputSelectName.split('.'),
    'permissions',
    'controllers',
    'policy'
  );
  const controllerRoutes = get(
    routes,
    without(
      inputSelectName.split('.'),
      'permissions',
      'controllers',
      'policy'
    )[0]
  );
  const displayedRoutes = isEmpty(controllerRoutes)
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
          {!shouldDisplayPoliciesHint ? (
            <Input
              customBootstrapClass="col-md-12"
              label={{ id: 'users-permissions.Policies.InputSelect.label' }}
              name={inputSelectName}
              onChange={onChange}
              selectOptions={selectOptions}
              type="select"
              validations={{}}
              value={value}
            />
          ) : (
            ''
          )}
        </div>
        <div className="row">
          {!shouldDisplayPoliciesHint
            ? map(displayedRoutes, (route, key) => (
                <BoundRoute key={key} route={route} />
              ))
            : ''}
        </div>
      </div>
    </Wrapper>
  );
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
