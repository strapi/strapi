import React, {
  memo,
  // useCallback,
  // useEffect,
  useMemo,
  // useReducer, useRef
} from 'react';
import {
  BaselineAlignment,
  SizedInput,
  useGlobalContext,
  // request
} from 'strapi-helper-plugin';
import {
  // checkFormValidity,
  getRequestUrl,
} from '../../../../../admin/src/utils';
import PageTitle from '../../../../../admin/src/components/SettingsPageTitle';
import ContainerFluid from '../../../../../admin/src/components/ContainerFluid';
import FormBloc from '../../../../../admin/src/components/FormBloc';
import { Header } from '../../../../../admin/src/components/Settings';
import { useRolesList, useUsersForm } from '../../../../../admin/src/hooks';
import { form, schema } from './utils';
// import reducer, { initialState } from './reducer';

const SingleSignOn = () => {
  const { formatMessage } = useGlobalContext();
  // const [
  //   { formErrors, isLoading, initialData, modifiedData, showHeaderButtonLoader },
  //   dispatch,
  // ] = useReducer(reducer, initialState);
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader },
    // eslint-disable-next-line no-unused-vars
    dispatch,
    { handleCancel, handleChange, handleSubmit },
  ] = useUsersForm(getRequestUrl('providers/options'), schema, () => {}, [
    'autoRegister',
    'defaultRole',
  ]);
  const { roles, isLoading: isLoadingForRoles } = useRolesList();

  // useEffect(() => {
  //   const abortController = new AbortController();
  //   const { signal } = abortController;

  //   const getData = async signal => {
  //     try {
  //       dispatch({ type: 'GET_DATA' });
  //       const data = await request(getRequestUrl('providers/options'), {
  //         method: 'GET',
  //         signal,
  //       });

  //       dispatch({
  //         type: 'GET_DATA_SUCCEEDED',
  //         data,
  //       });
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };

  //   getData(signal);

  //   return () => {
  //     abortController.abort();
  //   };
  // }, []);

  // const handleCancel = useCallback(() => {
  //   dispatch({ type: 'ON_CANCEL' });
  // }, []);

  // const handleChange = useCallback(({ target: { name, value } }) => {
  //   dispatch({
  //     type: 'ON_CHANGE',
  //     keys: name,
  //     value,
  //   });
  // }, []);

  // const handleSubmit = useCallback(
  //   async e => {
  //     e.preventDefault();
  //     const errors = await checkFormValidity(modifiedData, schema);

  //     dispatch({
  //       type: 'SET_ERRORS',
  //       errors: errors || {},
  //     });

  //     if (!errors) {
  //       try {
  //         strapi.lockAppWithOverlay();
  //         dispatch({ type: 'ON_SUBMIT' });

  //         const data = await request(getRequestUrl('providers/options'), {
  //           method: 'PUT',
  //           body: modifiedData,
  //         });

  //         dispatch({
  //           type: 'ON_SUBMIT_SUCCEEDED',
  //           data,
  //         });

  //         strapi.notification.toggle({
  //           type: 'success',
  //           message: { id: 'notification.success.saved' },
  //         });
  //       } catch (err) {
  //         console.error(err);
  //       }
  //     }
  //   },
  //   [modifiedData]
  // );

  const showLoader = useMemo(() => isLoadingForRoles || isLoading, [isLoading, isLoadingForRoles]);

  const options = useMemo(() => {
    return [
      <option key="placeholder" disabled value="">
        {formatMessage({ id: 'components.InputSelect.option.placeholder' })}
      </option>,
      ...roles.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      )),
    ];
  }, [roles, formatMessage]);

  return (
    <>
      <PageTitle name="SSO" />
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="0">
          <Header
            isLoading={showLoader}
            initialData={initialData}
            label={formatMessage({ id: 'Settings.sso.title' })}
            modifiedData={modifiedData}
            onCancel={handleCancel}
            content={formatMessage({ id: 'Settings.sso.description' })}
            showHeaderButtonLoader={showHeaderButtonLoader}
          />
          <BaselineAlignment top size="3px" />
          <FormBloc isLoading={showLoader}>
            {Object.keys(form).map(key => {
              return (
                <SizedInput
                  {...form[key]}
                  key={key}
                  disabled={false}
                  error={formErrors[key]}
                  name={key}
                  onChange={handleChange}
                  options={options}
                  value={modifiedData[key]}
                />
              );
            })}
          </FormBloc>
        </ContainerFluid>
      </form>
    </>
  );
};

export default memo(SingleSignOn);
