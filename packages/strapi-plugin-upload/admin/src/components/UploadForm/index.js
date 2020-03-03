import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import InputFileModal from '../InputFileModal';
import ModalNavWrapper from '../ModalNavWrapper';
import ModalSection from '../ModalSection';
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
      <ModalSection>
        {to === 'computer' && <InputFileModal onChange={addFilesToUpload} />}
        {to === 'url' && <div>COMING SOON</div>}
      </ModalSection>
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
