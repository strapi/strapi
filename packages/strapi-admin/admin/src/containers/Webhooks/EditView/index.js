/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { get, isEmpty, isEqual, omit } from 'lodash';
import { Header, Inputs as InputsIndex } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import {
  request,
  useGlobalContext,
  getYupInnerErrors,
  BackHeader,
} from 'strapi-helper-plugin';

import Inputs from '../../../components/Inputs';
import TriggerContainer from '../../../components/TriggerContainer';

import reducer, { initialState } from './reducer';
import { cleanData, form, schema } from './utils';

import Wrapper from './Wrapper';

function EditView() {
  const isMounted = useRef();
  const { formatMessage } = useGlobalContext();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { push } = useHistory();
  const { id } = useParams();
  const abortController = new AbortController();
  const { signal } = abortController;
  const isCreating = id === 'create';

  const {
    formErrors,
    modifiedData,
    initialData,
    isTriggering,
    triggerResponse,
  } = reducerState.toJS();

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      try {
        const { data } = await request(`/admin/webhooks/${id}`, {
          method: 'GET',
        });

        if (isMounted.current) {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data,
          });
        }
      } catch (err) {
        if (isMounted.current) {
          if (err.code !== 20) {
            strapi.notification.error('notification.error');
          }
        }
      }
    };

    if (!isCreating) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreating]);

  const { name } = modifiedData;

  const areActionDisabled = isEqual(initialData, modifiedData);

  const isTriggerActionDisabled =
    isCreating || (!isCreating && !areActionDisabled) || isTriggering;

  const formattedErrors = Object.keys(formErrors)
    .filter(key => key.includes('headers'))
    .reduce((obj, key) => {
      obj[key] = formErrors[key];

      return obj;
    }, {});

  const headerTitle = isCreating
    ? formatMessage({
      id: 'Settings.webhooks.create',
    })
    : name;
  const headersActions = [
    {
      color: 'primary',
      disabled: isTriggerActionDisabled,
      label: formatMessage({
        id: 'Settings.webhooks.trigger',
      }),
      onClick: () => handleTrigger(),
      style: {
        padding: '0 15px',
      },
      title: isTriggerActionDisabled
        ? formatMessage({
          id: 'Settings.webhooks.trigger.save',
        })
        : null,
      type: 'button',
      icon: (
        <Play
          width="14px"
          height="14px"
          fill={isTriggerActionDisabled ? '#b4b6ba' : '#ffffff'}
        />
      ),
    },
    {
      color: 'cancel',
      disabled: areActionDisabled,
      label: formatMessage({
        id: 'app.components.Button.reset',
      }),
      onClick: () => handleReset(),
      style: {
        padding: '0 20px',
      },
      type: 'button',
    },
    {
      color: 'success',
      disabled: areActionDisabled,
      label: formatMessage({
        id: 'app.components.Button.save',
      }),
      style: {
        minWidth: 140,
      },
      type: 'submit',
    },
  ];

  const headerProps = {
    title: {
      label: headerTitle,
    },
    actions: headersActions,
  };

  const checkFormErrors = async (submit = false) => {
    try {
      await schema.validate(modifiedData, { abortEarly: false });

      if (isMounted.current) {
        setErrors({});

        if (submit) {
          submitForm();
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setErrors(getYupInnerErrors(err));

        if (submit) {
          strapi.notification.error('notification.form.error.fields');
        }
      }
    }
  };

  const createWebhooks = async () => {
    try {
      await request('/admin/webhooks', {
        method: 'POST',
        body: cleanData(modifiedData),
      });

      if (isMounted.current) {
        dispatch({
          type: 'SUBMIT_SUCCEEDED',
        });

        strapi.notification.success('Settings.webhooks.created');
        goBack();
      }
    } catch (err) {
      if (isMounted.current) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const getErrorMessage = error => {
    if (!error) {
      return null;
    }

    return formatMessage({
      id: error.id,
    });
  };

  const goBack = () => push('/settings/webhooks');

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });

    if (submittedOnce) {
      if (name === 'events') {
        resetEventsError();
      }
      if (name.includes('headers')) {
        resetHeadersError(name);
      }
    }
  };

  const handleClick = () => {
    dispatch({
      type: 'ADD_NEW_HEADER',
      keys: ['headers'],
    });
  };

  const handleTrigger = async () => {
    dispatch({
      type: 'SET_IS_TRIGGERING',
    });

    try {
      const { data } = await request(`/admin/webhooks/${id}/trigger`, {
        method: 'POST',
        signal,
      });

      if (isMounted.current) {
        dispatch({
          type: 'TRIGGER_SUCCEEDED',
          response: data,
        });
      }
    } catch (err) {
      if (isMounted.current) {
        if (err.code !== 20) {
          strapi.notification.error('notification.error');
        }
        dispatch({
          type: 'SET_IS_TRIGGERING',
        });
      }
    }
  };

  const handleRemove = index => {
    dispatch({
      type: 'ON_HEADER_REMOVE',
      index,
    });

    resetHeadersErrors();
  };

  const handleReset = () =>
    dispatch({
      type: 'RESET_FORM',
    });

  const handleSubmit = e => {
    e.preventDefault();
    setSubmittedOnce(true);
    checkFormErrors(true);
  };

  const onCancelTrigger = () => {
    abortController.abort();

    dispatch({
      type: 'ON_TRIGGER_CANCELED',
    });
  };

  const resetEventsError = () => {
    const errors = formErrors;
    delete errors.events;
    setErrors(errors);
  };

  const resetHeadersError = keys => {
    const errors = formErrors;

    setErrors(omit(errors, [keys]));
  };

  const resetHeadersErrors = () => {
    const errors = formErrors;
    const newErrors = Object.keys(errors)
      .filter(key => !key.includes('headers'))
      .reduce((obj, key) => {
        obj[key] = formErrors[key];

        return obj;
      }, {});

    setErrors(newErrors);
  };

  const setErrors = errors => {
    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  const submitForm = () => {
    if (!isCreating) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const updateWebhook = async () => {
    try {
      const body = cleanData(modifiedData);
      delete body.id;

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });

      if (isMounted.current) {
        dispatch({
          type: 'SUBMIT_SUCCEEDED',
        });
        strapi.notification.success('notification.form.success.fields');
      }
    } catch (err) {
      if (isMounted.current) {
        strapi.notification.error('notification.error');
      }
    }
  };

  return (
    <Wrapper>
      <BackHeader onClick={goBack} />
      <form onSubmit={handleSubmit}>
        <Header {...headerProps} />
        {(isTriggering || !isEmpty(triggerResponse)) && (
          <div className="trigger-wrapper">
            <TriggerContainer
              isPending={isTriggering}
              response={triggerResponse}
              onCancel={onCancelTrigger}
            />
          </div>
        )}
        <div className="form-wrapper">
          <div className="form-card">
            <div className="row">
              {Object.keys(form).map(key => {
                return (
                  <div key={key} className={form[key].styleName}>
                    <InputsIndex
                      {...form[key]}
                      customInputs={{
                        headers: Inputs,
                        events: Inputs,
                      }}
                      label={formatMessage({
                        id: form[key].label,
                      })}
                      error={getErrorMessage(get(formErrors, key, null))}
                      name={key}
                      onChange={handleChange}
                      validations={form[key].validations}
                      value={modifiedData[key] || form[key].value}
                      {...(form[key].type === 'headers' && {
                        onClick: handleClick,
                        onRemove: handleRemove,
                        customError: formattedErrors,
                      })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Wrapper>
  );
}

export default EditView;
