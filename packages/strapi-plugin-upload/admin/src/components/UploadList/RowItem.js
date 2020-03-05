import React from 'react';
import PropTypes from 'prop-types';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import CardImgWrapper from '../CardImgWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';

const RowItem = ({
  // file,
  fileInfo,
  hasError,
  errorMessage,
  isUploading,
  onClick,
  onClickEdit,
  originalIndex,
}) => {
  const handleClick = () => {
    onClick(originalIndex);
  };

  const handleClickEdit = () => {
    onClickEdit(originalIndex);
  };

  return (
    <div className="col-3" key={originalIndex}>
      <div>
        <CardImgWrapper isSmall hasError={hasError}>
          {isUploading && <InfiniteLoadingIndicator onClick={handleClick} />}
          {!isUploading && (
            <CardControlsWrapper className="card-control-wrapper">
              <CardControl onClick={handleClickEdit} />
            </CardControlsWrapper>
          )}
        </CardImgWrapper>
        <p style={{ marginBottom: 14 }}>{errorMessage || fileInfo.name}</p>
      </div>
    </div>
  );
};

RowItem.defaultProps = {
  errorMessage: null,
};

RowItem.propTypes = {
  // file: PropTypes.object.isRequired,
  fileInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  hasError: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  isUploading: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onClickEdit: PropTypes.func.isRequired,
  originalIndex: PropTypes.number.isRequired,
};

export default RowItem;
