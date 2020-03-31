import React from 'react';
import PropTypes from 'prop-types';

import Card from '../Card';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';

const RowItem = ({
  file,
  fileInfo,
  hasError,
  errorMessage,
  isUploading,
  onClick,
  onClickDeleteFileToUpload,
  onClickEdit,
  originalIndex,
}) => {
  const url = URL.createObjectURL(file);

  const handleClick = () => {
    onClick(originalIndex);
  };

  const handleClickDelete = () => {
    onClickDeleteFileToUpload(originalIndex);
  };

  const handleClickEdit = () => {
    onClickEdit(originalIndex);
  };

  return (
    <div className="col-xs-12 col-md-6 col-xl-3" key={originalIndex}>
      <Card
        small
        errorMessage={errorMessage}
        hasError={hasError}
        hasIcon
        type={file.type}
        size={file.size}
        url={url}
        {...fileInfo}
        withFileCaching={false}
      >
        {isUploading && <InfiniteLoadingIndicator onClick={handleClick} />}
        {!isUploading && (
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
  errorMessage: null,
};

RowItem.propTypes = {
  file: PropTypes.object.isRequired,
  fileInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  hasError: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  isUploading: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onClickDeleteFileToUpload: PropTypes.func.isRequired,
  onClickEdit: PropTypes.func.isRequired,
  originalIndex: PropTypes.number.isRequired,
};

export default RowItem;
