import React from 'react';
// import PropTypes from 'prop-types';
import {
  HeaderModalTitle,
  HeaderNavWrapper,
  ModalBody,
  ModalForm,
} from 'strapi-helper-plugin';
import ModalNav from '../ModalNav';
import NavLink from '../NavLink';
import InputFile from '../InputFile';

const UploadForm = () => {
  return (
    <>
      <HeaderNavWrapper>
        <HeaderModalTitle>
          <div className="settings-tabs" style={{ left: 30 }}>
            <ModalNav>
              <NavLink isActive to="computer" />
              <NavLink to="url" isDisabled />
            </ModalNav>
          </div>
          <hr />
        </HeaderModalTitle>
      </HeaderNavWrapper>
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
    </>
  );
};

export default UploadForm;
