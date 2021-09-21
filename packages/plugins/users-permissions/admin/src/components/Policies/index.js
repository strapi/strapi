import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Box, Select, Option, GridItem, H3, Text, Stack } from '@strapi/parts';
import { get, isEmpty, takeRight, toLower, without } from 'lodash';

import { getTrad } from '../../utils';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';
import SizedInput from '../SizedInput';
import { Header, Wrapper, Sticky } from './Components';

const Policies = () => {
  const { formatMessage } = useIntl();
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
    <GridItem
      col={5}
      background="neutral150"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
      style={{ minHeight: '100%' }}
    >
      <H3>
        {formatMessage({
          id: 'users-permissions.Policies.header.title',
          defaultMessage: 'Advanced settings',
        })}
      </H3>
      {selectedAction ? (
        <Stack size={4} paddingTop={6}>
          <Select
            value={value}
            onChange={onChange}
            label={formatMessage({
              id: 'Policies.InputSelect.label',
              defaultMessage: 'Allow to perform this action for:',
            })}
          >
            {policies.map(policy => (
              <Option value={policy.value} key={policy.value}>
                {policy.label}
              </Option>
          ))}
          </Select>
        </Stack>
      ) : (
        <Box paddingTop={2}>
          <Text as="p" textColor="neutral600">
            {formatMessage({
              id: 'users-permissions.Policies.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Text>
        </Box>
      )}
    </GridItem>
  );

  return (
    <Wrapper className="col-md-5">
      <Sticky className="container-fluid">
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
      </Sticky>
    </Wrapper>
  );
};

export default Policies;
