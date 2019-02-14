/*
 *
 * Onboarding actions
 *
 */

import { GET_VIDEOS, GET_VIDEOS_SUCCEEDED, ON_CLICK, SET_VIDEOS_DURATION } from './constants';

export function getVideos() {
  return {
    type: GET_VIDEOS,
  };
}

export function getVideosSucceeded(videos) {
  return {
    type: GET_VIDEOS_SUCCEEDED,
    videos,
  };
}

export function onClick(e) {
  return {
    type: ON_CLICK,
    index: parseInt(e.currentTarget.id, 10),
  };
}

export function setVideoDuration(id, duration) {
  return {
    type: SET_VIDEOS_DURATION,
    index: parseInt(id, 10),
    duration: parseFloat(duration, 10),
  };
}
