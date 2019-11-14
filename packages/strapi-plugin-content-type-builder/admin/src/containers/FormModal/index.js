import React, { useEffect, useReducer, useState } from 'react';
// import PropTypes from 'prop-types';
import {
  ButtonModal,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
  getYupInnerErrors,
  useGlobalContext,
} from 'strapi-helper-plugin';
import { Inputs } from '@buffetjs/custom';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, upperFirst } from 'lodash';
import pluginId from '../../pluginId';
import useQuery from '../../hooks/useQuery';
import useDataManager from '../../hooks/useDataManager';
import ModalHeader from '../../components/ModalHeader';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import forms from './utils/forms';
import init from './init';
import reducer, { initialState } from './reducer';

const getTrad = id => `${pluginId}.${id}`;
const NAVLINKS = [{ id: 'base' }, { id: 'advanced' }];

const FormModal = () => {
  const initialStateData = {
    actionType: null,
    modalType: null,
    settingType: null,
    // uid: null,
  };
  const [state, setState] = useState(initialStateData);
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { push } = useHistory();
  const { search } = useLocation();
  const { formatMessage } = useGlobalContext();
  const isOpen = !isEmpty(search);
  const query = useQuery();
  const { contentTypes, initialData } = useDataManager();
  const { formErrors, modifiedData } = reducerState.toJS();

  useEffect(() => {
    if (isOpen) {
      setState({
        actionType: query.get('actionType'),
        modalType: query.get('modalType'),
        settingType: query.get('settingType'),
        // uid: query.get('uid'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const isCreating = state.actionType === 'create';
  const headerId = isCreating
    ? `modalForm.${state.modalType}.header-create`
    : 'modalForm.header-edit';
  const name = get(initialData, ['schema', 'name'], '');
  const getNextSearch = nextTab => {
    const newSearch = Object.keys(state).reduce((acc, current) => {
      if (current !== 'settingType') {
        acc = `${acc}&${current}=${state[current]}`;
      } else {
        acc = `${acc}&${current}=${nextTab}`;
      }

      return acc;
    }, '');

    return newSearch;
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };
  const handleSubmit = async e => {
    e.preventDefault();

    try {
      const schema = forms.contentType.schema(Object.keys(contentTypes));

      await schema.validate(modifiedData, { abortEarly: false });
    } catch (err) {
      const errors = getYupInnerErrors(err);
      // TODO
      console.log({ errors });
      dispatch({
        type: 'SET_ERRORS',
        errors,
      });
    }
  };
  const handleToggle = () => {
    push({ search: '' });
  };
  const onClosed = () => {
    setState(initialStateData);
    dispatch({
      type: 'RESET_PROPS',
    });
  };
  const form = get(forms, [state.modalType, 'form', state.settingType], () => ({
    items: [],
  }));

  return (
    <Modal isOpen={isOpen} onClosed={onClosed} onToggle={handleToggle}>
      <HeaderModal>
        <ModalHeader
          name={name}
          headerId={headerId}
          type={state.modalType || 'contentType'}
        />
        <section>
          <HeaderModalTitle>
            <FormattedMessage id={getTrad('configurations')}>
              {msg => <span>{upperFirst(msg)}</span>}
            </FormattedMessage>
            <div className="settings-tabs">
              <HeaderModalNavContainer>
                {NAVLINKS.map((link, index) => {
                  return (
                    <HeaderNavLink
                      isActive={state.settingType === link.id}
                      key={link.id}
                      {...link}
                      onClick={() => {
                        setState(prev => ({ ...prev, settingType: link.id }));
                        push({ search: getNextSearch(link.id) });
                      }}
                      nextTab={index === NAVLINKS.length - 1 ? 0 : index + 1}
                    />
                  );
                })}
              </HeaderModalNavContainer>
            </div>
            <hr />
          </HeaderModalTitle>
        </section>
      </HeaderModal>
      <form onSubmit={handleSubmit}>
        <ModalForm>
          <ModalBody>
            <div className="container-fluid">
              {form(modifiedData).items.map((row, index) => {
                return (
                  <div className="row" key={index}>
                    {row.map(input => {
                      const errorId = get(
                        formErrors,
                        [...input.name.split('.'), 'id'],
                        null
                      );

                      return (
                        <div
                          className={`col-${input.size || 6}`}
                          key={input.name}
                        >
                          <Inputs
                            value={get(modifiedData, input.name, '')}
                            {...input}
                            error={
                              isEmpty(errorId)
                                ? null
                                : formatMessage({ id: errorId })
                            }
                            onChange={handleChange}
                            description={
                              get(input, 'description.id', null)
                                ? formatMessage(input.description)
                                : input.description
                            }
                            label={
                              get(input, 'label.id', null)
                                ? formatMessage(input.label)
                                : input.label
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ModalBody>
        </ModalForm>
        <ModalFooter>
          <section>
            <ButtonModal
              message="components.popUpWarning.button.cancel"
              onClick={handleToggle}
              isSecondary
            />
            <ButtonModal message="form.button.done" type="submit" />
          </section>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default FormModal;
