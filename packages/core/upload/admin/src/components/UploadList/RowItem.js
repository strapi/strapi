import React from 'react';
import PropTypes from 'prop-types';
import { pick } from 'lodash';

import Card from '../Card';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';

const RowItem = ({
  file,
  fileInfo,
  hasError,
  errorMessage,
  isDownloading,
  isUploading,
  onClick,
  onClickDeleteFileToUpload,
  onClickEdit,
  originalIndex,
}) => {
  const url = file ? URL.createObjectURL(file) : null;

  const handleClick = () => {
    onClick(originalIndex);
  };

  const handleClickDelete = () => {
    onClickDeleteFileToUpload(originalIndex);
  };

  const handleClickEdit = () => {
    onClickEdit(originalIndex);
  };

  let fileSize = null;

  if (file) {
    fileSize = file.mime ? file.type : file.size / 1000;
  }

  const shouldDisplayControls = !isUploading && !isDownloading && file !== null;
  const shouldDisplayTrashIcon = file === null && hasError;

  const cardOptions = {
    ...pick(fileInfo, ['ext', 'name', 'mime', 'height', 'width', 'previewUrl', 'id']),
    small: true,
    errorMessage,
    hasError,
    type: file ? file.type : null,
    size: fileSize,
    url,
    withFileCaching: false,
    withoutFileInfo: isDownloading || (file === null && hasError),
  };

  return (
    <div className="col-xs-12 col-md-6 col-xl-3" key={originalIndex}>
      <Card options={cardOptions}>
        {(isUploading || isDownloading) && <InfiniteLoadingIndicator onClick={handleClick} />}
        {shouldDisplayTrashIcon && (
          <CardControlsWrapper className="card-control-wrapper">
            <CardControl title="delete" onClick={handleClickDelete} type="trash-alt" small />
          </CardControlsWrapper>
        )}
        {shouldDisplayControls && (
          <CardControlsWrapper className="card-control-wrapper">
            <CardControl title="delete" onClick={handleClickDelete} type="trash-alt" small />
            <CardControl title="edit" onClick={handleClickEdit} small />
          </CardControlsWrapper>
        )}
      </Card>
    </div>
  );
};

RowItem.defaultProps = {
  file: null,
  errorMessage: null,
  isDownloading: false,
};

RowItem.propTypes = {
  file: PropTypes.object,
  fileInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  hasError: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  isDownloading: PropTypes.bool,
  isUploading: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onClickDeleteFileToUpload: PropTypes.func.isRequired,
  onClickEdit: PropTypes.func.isRequired,
  originalIndex: PropTypes.number.isRequired,
};

export default RowItem;
