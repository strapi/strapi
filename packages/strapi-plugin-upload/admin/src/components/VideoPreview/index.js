import React, { useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';

import Duration from '../Duration';
import LoadingIndicator from '../LoadingIndicator';
import PlayIcon from '../PlayIcon';
import Wrapper from './Wrapper';
import CanvasWrapper from './CanvasWrapper';
import Thumbnail from './Thumbnail';

import reducer, { initialState } from './reducer';

const VideoPreview = ({ hasIcon, previewUrl, src }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { duration, dataLoaded, isHover, metadataLoaded, snapshot, seeked } = reducerState.toJS();

  // Adapted from https://github.com/brothatru/react-video-thumbnail/blob/master/src/components/VideoThumbnail.js
  // And from https://github.com/soupette/poc-video-preview
  const canvasRef = useRef();
  const videoRef = useRef();

  useEffect(() => {
    const getSnapshot = () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const thumbnail = canvas.toDataURL('image/png');

        video.src = ''; // setting to empty string stops video from loading

        dispatch({
          type: 'SET_SNAPSHOT',
          snapshot: thumbnail,
        });
      } catch (e) {
        console.error(e);
      }
    };

    if (dataLoaded && metadataLoaded && videoRef.current) {
      videoRef.current.currentTime = 0;

      if (seeked && !snapshot) {
        getSnapshot();
      }
    }
  }, [dataLoaded, metadataLoaded, seeked, snapshot]);

  return (
    <Wrapper
      // Specify isHover to prevent bad behavior when compo is under the cursor on modal open
      onMouseEnter={() => {
        dispatch({
          type: 'SET_IS_HOVER',
          isHover: true,
        });
      }}
      onMouseLeave={() => {
        dispatch({
          type: 'SET_IS_HOVER',
          isHover: false,
        });
      }}
    >
      {!snapshot && <LoadingIndicator />}
      <CanvasWrapper>
        {previewUrl ? (
          <Thumbnail src={previewUrl} />
        ) : (
          <>
            <video
              muted
              ref={videoRef}
              src={src}
              crossOrigin="anonymous"
              onLoadedMetadata={() => {
                dispatch({
                  type: 'METADATA_LOADED',
                });
              }}
              onLoadedData={({ target: { duration } }) => {
                dispatch({
                  type: 'DATA_LOADED',
                  duration,
                });
              }}
              onSeeked={() => {
                dispatch({
                  type: 'SEEKED',
                });
              }}
            />
            <canvas ref={canvasRef} />
          </>
        )}
        <Duration duration={duration} />
        {(hasIcon || isHover) && <PlayIcon small />}
      </CanvasWrapper>
    </Wrapper>
  );
};

VideoPreview.defaultProps = {
  hasIcon: false,
  previewUrl: null,
  src: null,
};

VideoPreview.propTypes = {
  hasIcon: PropTypes.bool,
  previewUrl: PropTypes.string,
  src: PropTypes.string,
};

export default VideoPreview;
