import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { HeaderNavWrapper, ModalBody, ModalForm } from 'strapi-helper-plugin';
import ModalNav from '../ModalNav';
import NavLink from '../NavLink';
import InputFile from '../InputFile';
import init from './init';
import reducer, { initialState } from './reducer';

const UploadForm = ({ addFilesToUpload }) => {
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
      </HeaderNavWrapper>
      <ModalForm>
        <ModalBody style={{ paddingTop: 35, paddingBottom: 18 }}>
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                {to === 'computer' && <InputFile onChange={addFilesToUpload} />}
                {to === 'url' && <div>COMING SOON</div>}
              </div>
            </div>
          </div>
        </ModalBody>
      </ModalForm>
    </>
  );
};

UploadForm.defaultProps = {
  addFilesToUpload: () => {},
};

UploadForm.propTypes = {
  addFilesToUpload: PropTypes.func,
};

export default UploadForm;
