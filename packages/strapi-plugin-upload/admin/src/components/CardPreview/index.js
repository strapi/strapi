import React from 'react';
import PropTypes from 'prop-types';

import { getExtension, getType } from '../../utils';

import BrokenFile from '../../icons/BrokenFile';
import FileIcon from '../FileIcon';
import VideoPreview from '../VideoPreview';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ hasError, url, type }) => {
  const isFile = getType(type) === 'file';
  const isVideo = getType(type) === 'video';

  if (hasError) {
    return (
      <Wrapper isFile>
        <BrokenFile />
      </Wrapper>
    );
  }

  if (isFile) {
    return (
      <Wrapper isFile>
        <FileIcon ext={getExtension(type)} />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {isVideo ? (
        <VideoPreview
          src={url}
          thumebnailHandler={thumbnail => console.log(thumbnail)}
          // width={120}
          // height={80}
          snapshotAtTime={0}
        />
      ) : (
        <Image src={url} />
      )}
    </Wrapper>
  );
};

CardPreview.defaultProps = {
  hasError: false,
  url: null,
  type: '',
};

CardPreview.propTypes = {
  hasError: PropTypes.bool,
  url: PropTypes.string,
  type: PropTypes.string,
};

export default CardPreview;
