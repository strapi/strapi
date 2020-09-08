import React, { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Col } from 'reactstrap';
import { get, isEmpty, takeRight, toLower, without } from 'lodash';
import { getTrad } from '../../utils';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';
import SizedInput from '../SizedInput';
import { Header, Wrapper } from './Components';

const Policies = () => {
  const { modifiedData, selectedAction, routes, policies, onChange } = useUsersPermissions();
  const baseTitle = 'users-permissions.Policies.header';
  const title = !selectedAction ? 'hint' : 'title';
  const path = without(selectedAction.split('.'), 'controllers');
  const controllerRoutes = get(routes, path[0]);
  const displayedRoutes = isEmpty(controllerRoutes)
    ? []
    : controllerRoutes.filter(o => toLower(o.handler) === toLower(takeRight(path, 2).join('.')));

  const inputName = `${selectedAction}.policy`;

  const value = useMemo(() => {
    return get(modifiedData, inputName, '');
  }, [inputName, modifiedData]);

  return (
    <Wrapper className="col-md-5">
      <div className="container-fluid">
        <div className="row">
          <Header className="col-md-12">
            <FormattedMessage id={`${baseTitle}.${title}`} />
          </Header>
          {selectedAction && (
            <>
              <SizedInput
                type="select"
                name={inputName}
                onChange={onChange}
                label={getTrad('Policies.InputSelect.label')}
                options={policies}
                value={value}
              />

              <div className="row">
                <Col size={{ xs: 12 }}>
                  {displayedRoutes.map((route, key) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <BoundRoute key={key} route={route} />
                  ))}
                </Col>
              </div>
            </>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default Policies;
