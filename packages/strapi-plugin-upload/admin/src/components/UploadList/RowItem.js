import React from 'react';
import PropTypes from 'prop-types';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import CardImgWrapper from '../CardImgWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';

const RowItem = ({
  file,
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

  // FIXME:
  const isImg = file.type.includes('image');

  return (
    <div className="col-3" key={originalIndex}>
      <div>
        <CardImgWrapper isSmall hasError={hasError}>
          {isUploading && <InfiniteLoadingIndicator onClick={handleClick} />}
          {!isUploading && isImg && (
            <CardControlsWrapper className="card-control-wrapper">
              <CardControl onClick={handleClickEdit} />
            </CardControlsWrapper>
          )}
        </CardImgWrapper>
        <p style={{ marginBottom: 14 }}>{errorMessage || file.name}</p>
      </div>
    </div>
  );
};

RowItem.defaultProps = {
  errorMessage: null,
};

RowItem.propTypes = {
  file: PropTypes.object.isRequired,
  hasError: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  isUploading: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onClickEdit: PropTypes.func.isRequired,
  originalIndex: PropTypes.number.isRequired,
};

export default RowItem;
