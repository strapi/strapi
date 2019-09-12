import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';
import { Redirect } from 'react-router-dom';
import {
  difference,
  getYupInnerErrors,
  InputsIndex as Input,
  LoadingIndicatorPage,
  PluginHeader,
  request,
} from 'strapi-helper-plugin';
import useFetch from '../../hooks/useFetch';
import pluginId from '../../pluginId';

import FormWrapper from '../../components/FormWrapper';
import forms from './forms';
import reducer, { initialState } from './reducer';

const getTrad = key => `${pluginId}.${key}`;

const ConfigPage = ({
  emitEvent,
  match: {
    params: { slug },
  },
}) => {
  const endPoint = `configurations/${slug}`;
  const { data, isLoading } = useFetch([endPoint]);
  const [reducerState, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!isLoading) {
      const [response] = data;

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        response,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const {
    errors,
    didCheckErrors,
    initialData,
    modifiedData,
  } = reducerState.toJS();
  const body = difference(modifiedData, initialData);

  const handleSubmit = async e => {
    e.preventDefault();
    let formErrors = {};
    const schema = forms[slug].schema;

    try {
      await schema.validate(modifiedData, { abortEarly: false });

      if (!isEmpty(body)) {
        try {
          await request(
            `/${pluginId}/${endPoint}`,
            { method: 'PUT', body, params: { source: 'db' } },
            true
          );
          emitEvent('willEditSettings', { category: endPoint });
          dispatch({
            type: 'SUBMIT_SUCCEEDED',
          });
          strapi.notification.success(
            getTrad('strapi.notification.success.settingsEdit')
          );
        } catch (err) {
          strapi.notification.error('notification.error');
        }
      }
    } catch (err) {
      formErrors = getYupInnerErrors(err);
      strapi.notification.info('notification.form.error.fields');
    } finally {
      dispatch({
        type: 'SET_ERRORS',
        errors: formErrors,
      });
    }
  };

  if (!Object.keys(forms).includes(slug)) {
    return <Redirect to="application" />;
  }

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const pluginHeaderActions = isEmpty(body)
    ? []
    : [
        {
          label: getTrad('form.button.cancel'),
          onClick: () => {
            dispatch({
              type: 'RESET_FORM',
            });
          },
          kind: 'secondary',
          type: 'button',
        },
        {
          label: getTrad('form.button.save'),
          onClick: handleSubmit,
          kind: 'primary',
          type: 'submit',
          id: 'saveData',
        },
      ];

  return (
    <>
      <form onSubmit={handleSubmit}>
        <PluginHeader
          description={{ id: getTrad(`form.${slug}.description`) }}
          title={{ id: getTrad(`form.${slug}.name`) }}
          actions={pluginHeaderActions}
        />
        <FormWrapper>
          <div className="container">
            {get(forms, slug, []).inputs.map((row, index) => {
              return (
                <div className="row" key={index}>
                  {row.map((input, i) => {
                    return (
                      <Input
                        {...input}
                        autoFocus={index === 0 && i == 0}
                        didCheckErrors={didCheckErrors}
                        errors={get(errors, [input.name], [])}
                        key={input.name}
                        onChange={({ target: { name, value } }) => {
                          dispatch({
                            type: 'ON_CHANGE',
                            keys: name,
                            value,
                          });
                        }}
                        value={get(modifiedData, [input.name], '')}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </FormWrapper>
      </form>
    </>
  );
};

ConfigPage.propTypes = {
  emitEvent: PropTypes.func.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
};

export default ConfigPage;
