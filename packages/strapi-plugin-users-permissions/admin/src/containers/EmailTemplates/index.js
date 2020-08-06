import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Padded } from '@buffetjs/core';
import { Header, List } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import { get } from 'lodash';
import {
  Modal,
  ModalFooter,
  ModalHeader,
  ModalSection,
  SettingsPageTitle,
  SizedInput,
  useUserPermissions,
  request,
  getYupInnerErrors,
} from 'strapi-helper-plugin';
import { Row } from 'reactstrap';
import pluginPermissions from '../../permissions';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import ListRow from '../../components/ListRow';
import ModalFormWrapper from '../../components/ModalFormWrapper';
import { getRequestURL, getTrad } from '../../utils';
import forms from './utils/forms';
import schema from './utils/schema';
import reducer, { initialState } from './reducer';

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const buttonSubmitRef = useRef(null);
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.emailTemplates') });
  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateEmailTemplates };
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [{ formErrors, isLoading, modifiedData }, dispatch] = useReducer(reducer, initialState);
  const emailTemplates = useMemo(() => {
    return Object.keys(modifiedData).reduce((acc, current) => {
      const { display, icon } = modifiedData[current];

      acc.push({
        id: current,
        name: formatMessage({ id: getTrad(display) }),
        icon: ['fas', icon],
      });

      return acc;
    }, []);
  }, [modifiedData, formatMessage]);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useUserPermissions(updatePermissions);
  const listTitle = useMemo(() => {
    const count = emailTemplates.length;

    return formatMessage(
      {
        id: getTrad(`List.title.emailTemplates.${count > 1 ? 'plural' : 'singular'}`),
      },
      { number: count }
    );
  }, [emailTemplates.length, formatMessage]);

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL('email-templates'), { method: 'GET' });

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

  const handleChange = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  }, []);

  const handleClosed = useCallback(() => {
    setTemplateToEdit(null);
    setShowForm(false);
    dispatch({
      type: 'RESET_FORM',
    });
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClickEdit = useCallback(
    template => {
      setTemplateToEdit(template);
      handleToggle();
    },
    [handleToggle]
  );

  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();

      let errors = {};

      try {
        setIsSubmiting(true);
        await schema.validate(modifiedData[templateToEdit.id], { abortEarly: false });

        try {
          await request(getRequestURL('email-templates'), {
            method: 'PUT',
            body: { 'email-templates': modifiedData },
          });

          strapi.notification.success(getTrad('notification.success.submit'));

          dispatch({ type: 'ON_SUBMIT_SUCCEEDED' });

          handleToggle();
        } catch (err) {
          console.error(err);

          strapi.notification.error('notification.error');
        }
      } catch (err) {
        errors = getYupInnerErrors(err);
      } finally {
        setIsSubmiting(false);
      }

      dispatch({
        type: 'SET_ERRORS',
        errors,
      });
    },
    [modifiedData, templateToEdit, handleToggle]
  );

  const handleClick = useCallback(() => {
    buttonSubmitRef.current.click();
  }, []);

  const handleOpened = useCallback(() => {
    setShowForm(true);
  }, []);

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <Header title={{ label: pageTitle }} isLoading={isLoadingForPermissions || isLoading} />
        <ListBaselineAlignment />
        <List
          title={listTitle}
          items={emailTemplates}
          isLoading={isLoadingForPermissions || isLoading}
          customRowComponent={template => (
            <ListRow
              {...template}
              onClick={() => {
                if (canUpdate) {
                  handleClickEdit(template);
                }
              }}
              links={[
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => {
                    handleClickEdit(template);
                  },
                },
              ]}
            />
          )}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onOpened={handleOpened}
        onToggle={handleToggle}
        onClosed={handleClosed}
      >
        <ModalHeader
          headerBreadcrumbs={[
            getTrad('PopUpForm.header.edit.email-templates'),
            get(templateToEdit, 'name', ''),
          ]}
        />
        <ModalSection>
          <ModalFormWrapper>
            <ListBaselineAlignment />
            <Padded top size="md">
              {showForm && (
                <form onSubmit={handleSubmit}>
                  <Row>
                    {forms.map(input => {
                      const id = get(templateToEdit, 'id');

                      return (
                        <SizedInput
                          key={input.name}
                          {...input}
                          error={formErrors[input.name]}
                          name={`${id}.${input.name}`}
                          onChange={handleChange}
                          value={get(modifiedData, [id, ...input.name.split('.')], '')}
                        />
                      );
                    })}
                  </Row>
                  <button type="submit" style={{ display: 'none' }} ref={buttonSubmitRef}>
                    hidden button to use the native form event
                  </button>
                </form>
              )}
            </Padded>
          </ModalFormWrapper>
        </ModalSection>
        <ModalFooter>
          <section>
            <Button type="button" color="cancel" onClick={handleToggle}>
              {formatMessage({ id: 'app.components.Button.cancel' })}
            </Button>
            <Button color="success" type="button" onClick={handleClick} isLoading={isSubmiting}>
              {formatMessage({ id: 'app.components.Button.save' })}
            </Button>
          </section>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default EmailTemplatesPage;
