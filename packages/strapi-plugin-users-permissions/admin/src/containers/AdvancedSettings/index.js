import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useIntl } from 'react-intl';
import { Header } from '@buffetjs/custom';
import {
  FormBloc,
  SettingsPageTitle,
  SizedInput,
  useUserPermissions,
  request,
} from 'strapi-helper-plugin';
import { Container } from 'reactstrap';
import styled from 'styled-components';
import pluginPermissions from '../../permissions';
import { getTrad, getRequestURL } from '../../utils';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import form from './utils/form';
import reducer, { initialState } from './reducer';

const ContainerFluid = styled(Container)`
  padding: ${({ padding }) => padding};
`;

const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.advancedSettings') });
  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateAdvancedSettings };
  }, []);
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useUserPermissions(updatePermissions);
  const [{ isLoading, modifiedData, roles }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL('advanced'), { method: 'GET' });
        console.log({ data });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        dispatch({
          type: 'GET_DATA_ERROR',
        });
        console.error(err);
        strapi.notification.error('notification.error');
      }
    };

    if (!isLoadingForPermissions) {
      getData();
    }
  }, [isLoadingForPermissions]);

  const handleChange = useCallback(({ target }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: target.name,
      value: target.value,
    });
  }, []);

  const handleSubmit = useCallback(e => {
    e.preventDefault();
  }, []);

  const showLoader = isLoadingForPermissions || isLoading;

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <form onSubmit={handleSubmit}>
          <Header title={{ label: pageTitle }} isLoading={showLoader} />
          <ContainerFluid padding="0">
            <ListBaselineAlignment />
            <FormBloc title="Settings" isLoading={showLoader}>
              {form.map(input => {
                return (
                  <SizedInput
                    key={input.name}
                    {...input}
                    disabled={!canUpdate}
                    onChange={handleChange}
                    options={roles}
                    value={modifiedData[input.name]}
                  />
                );
              })}
            </FormBloc>
          </ContainerFluid>
        </form>
      </div>
    </>
  );
};

export default AdvancedSettingsPage;
