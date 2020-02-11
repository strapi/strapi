import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import Wrapper from './Wrapper';
import formatVideoArray from './utils/formatAndStoreVideoArray';
import init from './init';
import reducer, { initialState } from './reducer';

const OnboardingVideos = () => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { shouldShowVideoOnboarding } = reducerState.toJS();

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
  if (!shouldShowVideoOnboarding) {
    return null;
  }

  return <Wrapper>COMING SOON</Wrapper>;
};

export default OnboardingVideos;
