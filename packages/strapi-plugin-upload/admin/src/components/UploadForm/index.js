import React from 'react';
import PropTypes from 'prop-types';
import InputFileModal from '../InputFileModal';
import ModalNavWrapper from '../ModalNavWrapper';
import ModalSection from '../ModalSection';

const UploadForm = ({ addFilesToUpload }) => {
  const links = [
    { to: 'computer', label: 'computer', isDisabled: false },
    { to: 'url', label: 'url', isDisabled: true },
  ];

  return (
    <ModalNavWrapper links={links}>
      {to => (
        <ModalSection>
          {to === 'computer' && <InputFileModal onChange={addFilesToUpload} />}
          {to === 'url' && <div>COMING SOON</div>}
        </ModalSection>
      )}
    </ModalNavWrapper>
  );
};

UploadForm.defaultProps = {
  addFilesToUpload: () => {},
};

UploadForm.propTypes = {
  addFilesToUpload: PropTypes.func,
};

export default UploadForm;
