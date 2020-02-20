import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { ModalBody } from 'strapi-helper-plugin';
import InputFile from '../InputFile';
import ModalNavWrapper from '../ModalNavWrapper';
import init from './init';
import reducer, { initialState } from './reducer';

const UploadForm = ({ addFilesToUpload }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { to } = reducerState.toJS();
  const links = [
    { to: 'computer', label: 'computer', isDisabled: false },
    { to: 'url', label: 'url', isDisabled: true },
  ];

  const handleClickGoTo = to => {
    dispatch({
      type: 'SET_TAB',
      to,
    });
  };

  return (
    <>
      <ModalNavWrapper links={links} to={to} onClickGoTo={handleClickGoTo} />
      <ModalBody style={{ paddingTop: 35, paddingBottom: 18 }}>
        <div className="col-12">
          {to === 'computer' && <InputFile onChange={addFilesToUpload} />}
          {to === 'url' && <div>COMING SOON</div>}
        </div>
      </ModalBody>
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
