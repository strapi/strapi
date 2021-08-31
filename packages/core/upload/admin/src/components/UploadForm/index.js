import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import InputFileModal from '../InputFileModal';
import InputUploadURL from '../InputUploadURL';
import ModalNavWrapper from '../ModalNavWrapper';
import ModalSection from '../ModalSection';

const UploadForm = ({
  addFilesToUpload,
  filesToDownload,
  formErrors,
  onChange,
  setShouldDisplayNextButton,
}) => {
  useEffect(() => {
    return () => {
      setShouldDisplayNextButton(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = to => {
    setShouldDisplayNextButton(to === 'url');
  };

  const links = [
    { to: 'computer', label: 'computer', isDisabled: false, onClick: handleClick },
    { to: 'url', label: 'url', isDisabled: false, onClick: handleClick },
  ];

  return (
    <ModalNavWrapper links={links}>
      {to => (
        <ModalSection>
          {to === 'computer' && <InputFileModal onChange={addFilesToUpload} />}
          {to === 'url' && (
            <InputUploadURL errors={formErrors} onChange={onChange} value={filesToDownload} />
          )}
        </ModalSection>
      )}
    </ModalNavWrapper>
  );
};

UploadForm.defaultProps = {
  addFilesToUpload: () => {},
  filesToDownload: [],
  formErrors: null,
  onChange: () => {},
  setShouldDisplayNextButton: () => {},
};

UploadForm.propTypes = {
  addFilesToUpload: PropTypes.func,
  filesToDownload: PropTypes.arrayOf(PropTypes.string),
  formErrors: PropTypes.object,
  onChange: PropTypes.func,
  setShouldDisplayNextButton: PropTypes.func,
};

export default UploadForm;
