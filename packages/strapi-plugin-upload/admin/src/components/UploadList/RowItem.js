import React from 'react';
import PropTypes from 'prop-types';
import CardImgWrapper from '../CardImgWrapper';
import InfiniteLoadingIndicator from '../InfiniteLoadingIndicator';

const RowItem = ({
  file,
  hasError,
  errorMessage,
  isUploading,
  onClick,
  originalIndex,
}) => {
  const handleClick = () => {
    onClick(originalIndex);
  };

  return (
    <div className="col-3" key={originalIndex}>
      <div>
        <CardImgWrapper isSmall hasError={hasError}>
          {isUploading && <InfiniteLoadingIndicator onClick={handleClick} />}
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
  originalIndex: PropTypes.number.isRequired,
};

export default RowItem;
