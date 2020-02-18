import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from '@buffetjs/core';
import getTrad from '../../utils/getTrad';
import HeaderWrapper from './HeaderWrapper';

const UploadList = ({ filesToUpload, onGoToAddBrowseFiles }) => {
  const filesToUploadLength = filesToUpload.length;
  const titleId = `modal.upload-list.sub-header-title.${
    filesToUploadLength > 1 ? 'plural' : 'singular'
  }`;

  console.log(filesToUpload);

  return (
    <>
      <HeaderWrapper>
        <div>
          <div className="assets-selected">
            <FormattedMessage
              id={getTrad(titleId)}
              values={{ number: filesToUploadLength }}
            />
          </div>
          <div className="infos">
            <FormattedMessage
              id={getTrad('modal.upload-list.sub-header-subtitle')}
              values={{ number: filesToUploadLength }}
            />
          </div>
        </div>
        <div>
          <FormattedMessage id={getTrad('modal.upload-list.sub-header.button')}>
            {label => (
              <Button
                type="button"
                color="primary"
                label={label}
                onClick={onGoToAddBrowseFiles}
              />
            )}
          </FormattedMessage>
        </div>
      </HeaderWrapper>
    </>
  );
};

UploadList.defaultProps = {
  filesToUpload: [],
  onGoToAddBrowseFiles: () => {},
};

UploadList.propTypes = {
  filesToUpload: PropTypes.array,
  onGoToAddBrowseFiles: PropTypes.func,
};

export default UploadList;
