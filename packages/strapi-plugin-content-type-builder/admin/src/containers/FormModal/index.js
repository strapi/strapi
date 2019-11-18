import React, { useEffect, useReducer, useRef, useState } from 'react';
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
import AttributeOption from '../../components/AttributeOption';
import ModalHeader from '../../components/ModalHeader';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import getTrad from '../../utils/getTrad';
import getAttributes from './utils/attributes';
import forms from './utils/forms';
import { createUid } from './utils/createUid';
import init from './init';
import reducer, { initialState } from './reducer';

const NAVLINKS = [{ id: 'base' }, { id: 'advanced' }];

const FormModal = () => {
  const initialStateData = {
    actionType: null,
    modalType: null,
    settingType: null,
    for: null,
    target: null,
    attributeType: null,
  };
  const [state, setState] = useState(initialStateData);
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { push } = useHistory();
  const { search } = useLocation();
  const { formatMessage } = useGlobalContext();
  const query = useQuery();
  const attributeOptionRef = useRef();

  const { contentTypes, createSchema, initialData } = useDataManager();
  const { formErrors, modifiedData } = reducerState.toJS();

  useEffect(() => {
    if (!isEmpty(search)) {
      setState({
        actionType: query.get('actionType'),
        modalType: query.get('modalType'),
        settingType: query.get('settingType'),
        for: query.get('for'),
        target: query.get('target'),
        attributeType: query.get('attributeType'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const displayedAttributes = getAttributes(state.for);

  const form = get(forms, [state.modalType, 'form', state.settingType], () => ({
    items: [],
  }));
  const iconType = ['components', 'contentType'].includes(state.modalType)
    ? state.modalType
    : state.for;
  const isCreatingCT = state.modalType === 'contentType';
  const isCreating = state.actionType === 'create';
  const isOpen = !isEmpty(search);
  const isPickingAttribute = state.modalType === 'chooseAttribute';
  const name = get(initialData, ['schema', 'name'], '');
  const uid = createUid(modifiedData.name || '');

  let headerId = isCreating
    ? `modalForm.${state.modalType}.header-create`
    : 'modalForm.header-edit';

  if (!['contentType', 'component'].includes(state.modalType)) {
    headerId = null;
  }

  const modalBodyStyle = isPickingAttribute
    ? { paddingTop: '0.5rem', paddingBottom: '3rem' }
    : {};

  const getModalTitleSubHeader = () => {
    switch (state.modalType) {
      case 'chooseAttribute':
        return getTrad(`modalForm.sub-header.chooseAttribute.${state.for}`);
      default:
        return getTrad('configurations');
    }
  };

  const getNextSearch = nextTab => {
    const newSearch = Object.keys(state).reduce((acc, current, index) => {
      if (current !== 'settingType') {
        acc = `${acc}${index === 0 ? '' : '&'}${current}=${state[current]}`;
      } else {
        acc = `${acc}${index === 0 ? '' : '&'}${current}=${nextTab}`;
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
      const schema = forms[state.modalType].schema(Object.keys(contentTypes));

      await schema.validate(modifiedData, { abortEarly: false });

      createSchema(modifiedData, state.modalType, uid);
      const nextSlug = isCreatingCT ? 'content-types' : 'component-categories';
      push({
        pathname: `/plugins/${pluginId}/${nextSlug}/${uid}`,
        search: `modalType=chooseAttribute&for=${state.modalType}&target=${modifiedData.name}`,
      });
      dispatch({
        type: 'RESET_PROPS',
      });
    } catch (err) {
      const errors = getYupInnerErrors(err);
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

  const onOpened = () => {
    if (state.modalType === 'chooseAttribute') {
      attributeOptionRef.current.focus();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpened={onOpened}
      onClosed={onClosed}
      onToggle={handleToggle}
    >
      <HeaderModal>
        <ModalHeader
          name={state.target || name}
          headerId={headerId}
          iconType={iconType || 'contentType'}
        />
        <section>
          <HeaderModalTitle>
            <FormattedMessage id={getModalTitleSubHeader()}>
              {msg => <span>{upperFirst(msg)}</span>}
            </FormattedMessage>
            {!isPickingAttribute && (
              <>
                <div className="settings-tabs">
                  <HeaderModalNavContainer>
                    {NAVLINKS.map((link, index) => {
                      return (
                        <HeaderNavLink
                          isActive={state.settingType === link.id}
                          key={link.id}
                          {...link}
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              settingType: link.id,
                            }));
                            push({ search: getNextSearch(link.id) });
                          }}
                          nextTab={
                            index === NAVLINKS.length - 1 ? 0 : index + 1
                          }
                        />
                      );
                    })}
                  </HeaderModalNavContainer>
                </div>
                <hr />
              </>
            )}
          </HeaderModalTitle>
        </section>
      </HeaderModal>
      <form onSubmit={handleSubmit}>
        <ModalForm>
          <ModalBody style={modalBodyStyle}>
            <div className="container-fluid">
              {isPickingAttribute
                ? displayedAttributes.map((row, i) => {
                    return (
                      <div key={i} className="row">
                        {i === 1 && (
                          <hr
                            style={{
                              width: 'calc(100% - 30px)',
                              marginBottom: 7,
                            }}
                          />
                        )}
                        {row.map((attr, index) => {
                          const tabIndex =
                            i === 0
                              ? index
                              : displayedAttributes[0].length + index;

                          return (
                            <AttributeOption
                              key={attr}
                              tabIndex={tabIndex}
                              isDisplayed
                              onClick={() => {}}
                              ref={
                                i === 0 && index === 0
                                  ? attributeOptionRef
                                  : null
                              }
                              type={attr}
                            />
                          );
                        })}
                      </div>
                    );
                  })
                : form(modifiedData, state.attributeType).items.map(
                    (row, index) => {
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
                                  onBlur={() => {}}
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
                    }
                  )}
            </div>
          </ModalBody>
        </ModalForm>
        {!isPickingAttribute && (
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
        )}
      </form>
    </Modal>
  );
};

export default FormModal;
