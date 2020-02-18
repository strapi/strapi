import React from 'react';
import PropTypes from 'prop-types';
import {
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../utils/getTrad';
import InputFile from '../../components/InputFile';
import ModalNav from '../../components/ModalNav';
import NavLink from '../../components/NavLink';

const ModalStepper = ({ isOpen, onToggle }) => {
  return (
    <Modal
      isOpen={isOpen}
      onToggle={onToggle}
      // TODO: reset to initialState
      onClosed={() => {}}
    >
      <HeaderModal>
        <section>
          <HeaderModalTitle>
            <FormattedMessage id={getTrad('modal.header.browse')} />
          </HeaderModalTitle>
        </section>
        <section>
          <HeaderModalTitle>
            <div className="settings-tabs" style={{ left: 30 }}>
              <ModalNav>
                <NavLink isActive to="computer" />
                <NavLink to="url" isDisabled />
              </ModalNav>
            </div>
            <hr />
          </HeaderModalTitle>
        </section>
        <ModalForm>
          <ModalBody style={{ paddingTop: 35, paddingBottom: 18 }}>
            <div className="container-fluid">
              <div className="row">
                <div className="col-12">
                  <InputFile />
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalForm>

        <ModalFooter>
          <section>
            <Button type="button" color="cancel" onClick={onToggle}>
              Cancel
            </Button>
          </section>
        </ModalFooter>
      </HeaderModal>
    </Modal>
  );
};

ModalStepper.defaultProps = {
  onToggle: () => {},
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
};

export default ModalStepper;
