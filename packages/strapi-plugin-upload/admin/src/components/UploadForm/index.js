import React, { useReducer } from 'react';
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
import init from './init';
import reducer, { initialState } from './reducer';

const UploadForm = () => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { to } = reducerState.toJS();
  const links = ['computer', 'url'];

  const handleGoTo = to => {
    dispatch({
      type: 'SET_TAB',
      to,
    });
  };

  return (
    <>
      <HeaderNavWrapper>
        <HeaderModalTitle>
          <div className="settings-tabs" style={{ left: 30 }}>
            <ModalNav>
              {links.map(link => {
                const isActive = link === to;

                return (
                  <NavLink
                    key={link}
                    to={link}
                    isActive={isActive}
                    isDisabled={link === 'url'}
                    onClick={handleGoTo}
                  />
                );
              })}
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
                {to === 'computer' && <InputFile />}
                {to === 'url' && <div>COMING SOON</div>}
              </div>
            </div>
          </div>
        </ModalBody>
      </ModalForm>
    </>
  );
};

export default UploadForm;
