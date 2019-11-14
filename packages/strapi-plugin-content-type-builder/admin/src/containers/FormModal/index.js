import React, { useEffect, useState } from 'react';
// import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import {
  ButtonModal,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalFooter,
  ModalForm,
} from 'strapi-helper-plugin';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { get, upperFirst } from 'lodash';
import pluginId from '../../pluginId';
import useQuery from '../../hooks/useQuery';
import useDataManager from '../../hooks/useDataManager';
import ModalHeader from '../../components/ModalHeader';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';

const getTrad = id => `${pluginId}.${id}`;
const NAVLINKS = [{ id: 'base' }, { id: 'advanced' }];

const FormModal = () => {
  const initialState = {
    actionType: null,
    modalType: null,
    settingType: null,
    // uid: null,
  };
  const [state, setState] = useState(initialState);
  const { push } = useHistory();
  const { search } = useLocation();
  const isOpen = !isEmpty(search);
  const query = useQuery();
  const { initialData } = useDataManager();

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
  const onClosed = () => {
    setState(initialState);
  };
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
  const handleToggle = () => {
    push({ search: '' });
  };

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
      <form onSubmit={() => {}}>
        <ModalForm>{/* <ModalBody>{renderForm()}</ModalBody> */}</ModalForm>
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
