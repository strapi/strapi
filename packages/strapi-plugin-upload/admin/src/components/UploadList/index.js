import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@buffetjs/core';
import HeaderWrapper from './HeaderWrapper';

const UploadList = ({ filesToUpload }) => {
  console.log(filesToUpload);

  return (
    <>
      <HeaderWrapper>
        <div>
          <div className="assets-selected">
            <span>4 selected assets</span>
          </div>
          <div className="infos">
            <span>
              Manage the assets before adding them to the Media Library
            </span>
          </div>
        </div>
        <div>
          <Button type="button" color="primary">
            Add More assets
          </Button>
        </div>
      </HeaderWrapper>
    </>
  );
};

UploadList.defaultProps = {
  filesToUpload: [],
};

UploadList.propTypes = {
  filesToUpload: PropTypes.array,
};

export default UploadList;
