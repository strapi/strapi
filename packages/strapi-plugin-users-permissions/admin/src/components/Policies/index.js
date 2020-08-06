import React, { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, takeRight, toLower, without } from 'lodash';
import { InputsIndex as Input } from 'strapi-helper-plugin';

import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';
import { Header, Wrapper } from './Components';

const Policies = () => {
  const { selectedAction, routes, permissions, policies, onSelectedPolicy } = useUsersPermissions();
  const baseTitle = 'users-permissions.Policies.header';
  const title = !selectedAction ? 'hint' : 'title';
  const path = without(selectedAction.split('.'), 'controllers');
  const controllerRoutes = get(routes, path[0]);
  const displayedRoutes = isEmpty(controllerRoutes)
    ? []
    : controllerRoutes.filter(o => toLower(o.handler) === toLower(takeRight(path, 2).join('.')));

  const handleChange = e => {
    onSelectedPolicy(e.target.value);
  };

  const value = useMemo(() => {
    return get(permissions, [...selectedAction.split('.'), 'policy'], '');
  }, [permissions, selectedAction]);

  return (
    <Wrapper className="col-md-5">
      <div className="container-fluid">
        <div className="row">
          <Header className="col-md-12">
            <FormattedMessage id={`${baseTitle}.${title}`} />
          </Header>
          {selectedAction && (
            <>
              <Input
                customBootstrapClass="col-md-12"
                label={{ id: 'users-permissions.Policies.InputSelect.label' }}
                name={selectedAction}
                onChange={handleChange}
                selectOptions={policies}
                type="select"
                validations={{}}
                value={value}
              />
              <div className="row">
                {displayedRoutes.map((route, key) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <BoundRoute key={key} route={route} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default Policies;
