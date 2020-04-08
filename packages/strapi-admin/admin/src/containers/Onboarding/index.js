import React, { useEffect, useReducer, memo } from 'react';
import { FormattedMessage } from 'react-intl';
import axios from 'axios';
import cn from 'classnames';
import { useGlobalContext } from 'strapi-helper-plugin';
import formatVideoArray from './utils/formatAndStoreVideoArray';
import Video from './Video';
import Wrapper from './Wrapper';
import init from './init';
import reducer, { initialState } from './reducer';

const OnboardingVideos = () => {
  const { emitEvent } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { isLoading, isOpen, videos } = reducerState.toJS();

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await axios.get('https://strapi.io/videos', {
          timeout: 1000,
        });
        const { didWatchVideos, videos } = formatVideoArray(data);

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          didWatchVideos,
          videos,
        });
      } catch (err) {
        console.error(err);
        dispatch({
          type: 'HIDE_VIDEO_ONBOARDING',
        });
      }
    };

    getData();
  }, []);

  // Hide the player in case of request error
  if (isLoading) {
    return null;
  }

  const handleClick = () => {
    const eventName = isOpen
      ? 'didOpenGetStartedVideoContainer'
      : 'didCloseGetStartedVideoContainer';

    dispatch({ type: 'SET_IS_OPEN' });
    emitEvent(eventName);
  };
  const handleClickOpenVideo = videoIndexToOpen => {
    dispatch({
      type: 'TOGGLE_VIDEO_MODAL',
      videoIndexToOpen,
    });
  };
  const handleUpdateVideoStartTime = (videoIndex, elapsedTime) => {
    dispatch({
      type: 'UPDATE_VIDEO_STARTED_TIME_AND_PLAYED_INFOS',
      videoIndex,
      elapsedTime,
    });
  };
  const setVideoDuration = (videoIndex, duration) => {
    dispatch({
      type: 'SET_VIDEO_DURATION',
      duration,
      videoIndex,
    });
  };

  const hasVideos = videos.length > 0;
  const className = hasVideos ? 'visible' : 'hidden';

  return (
    <Wrapper className={className} isOpen={isOpen}>
      <div className={cn('videosContent', isOpen ? 'shown' : 'hide')}>
        <div className="videosHeader">
          <p>
            <FormattedMessage id="app.components.Onboarding.title" />
          </p>
          <p>
            {Math.floor(
              (videos.filter(v => v.end).length * 100) / videos.length
            )}
            <FormattedMessage id="app.components.Onboarding.label.completed" />
          </p>
        </div>
        <ul className="onboardingList">
          {videos.map((video, index) => (
            <Video
              key={video.id || index}
              id={index}
              video={video}
              onClick={() => handleClickOpenVideo(index)}
              setVideoDuration={(_, duration) => {
                setVideoDuration(index, duration);
              }}
              getVideoCurrentTime={(_, elapsedTime) => {
                handleUpdateVideoStartTime(index, elapsedTime);
              }}
              didPlayVideo={(_, elapsedTime) => {
                const eventName = `didPlay${index}GetStartedVideo`;

                emitEvent(eventName, { timestamp: elapsedTime });
              }}
              didStopVideo={(_, elapsedTime) => {
                const eventName = `didStop${index}Video`;

                emitEvent(eventName, { timestamp: elapsedTime });
              }}
            />
          ))}
        </ul>
      </div>
      <div className="openBtn">
        <button
          onClick={handleClick}
          className={isOpen ? 'active' : ''}
          type="button"
        >
          <i className="fa fa-question" />
          <i className="fa fa-times" />
          <span />
        </button>
      </div>
    </Wrapper>
  );
};

export default memo(OnboardingVideos);
