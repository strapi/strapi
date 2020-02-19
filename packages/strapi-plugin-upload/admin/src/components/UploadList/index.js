/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { ModalBody } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import createMatrix from '../../utils/createMatrix';
import getTrad from '../../utils/getTrad';
import CardImgWrapper from '../CardImgWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';
import HeaderWrapper from './HeaderWrapper';

const UploadList = ({
  filesToUpload,
  onClickCancelUpload,
  onGoToAddBrowseFiles,
}) => {
  const matrix = createMatrix(filesToUpload);
  const filesToUploadLength = filesToUpload.length;
  const titleId = `modal.upload-list.sub-header-title.${
    filesToUploadLength > 1 ? 'plural' : 'singular'
  }`;

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
      <ModalBody>
        <div
          className="container"
          style={{
            marginTop: -4,
            marginBottom: 4,
            overflow: 'auto',
            maxHeight: 350,
          }}
        >
          {matrix.map((row, i) => {
            return (
              <div className="row" key={i}>
                {row.map(
                  (
                    {
                      file,
                      hasError,
                      errorMessage,
                      isUploading,
                      originalIndex,
                    },
                    j
                  ) => {
                    return (
                      <div className="col-3" key={j}>
                        <div>
                          <CardImgWrapper isSmall hasError={hasError}>
                            {isUploading && (
                              <InfiniteLoadingIndicator
                                onClick={() => {
                                  onClickCancelUpload(originalIndex);
                                }}
                              />
                            )}
                          </CardImgWrapper>
                          <p style={{ marginBottom: 14 }}>
                            {errorMessage || file.name}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            );
          })}
        </div>
      </ModalBody>
    </>
  );
};

UploadList.defaultProps = {
  filesToUpload: [],
  onClickCancelUpload: () => {},
  onGoToAddBrowseFiles: () => {},
};

UploadList.propTypes = {
  filesToUpload: PropTypes.array,
  onClickCancelUpload: PropTypes.func,
  onGoToAddBrowseFiles: PropTypes.func,
};

export default UploadList;
