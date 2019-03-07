/*
 *
 * Onboarding actions
 *
 */

import { GET_VIDEOS, GET_VIDEOS_SUCCEEDED, SHOULD_OPEN_MODAL, ON_CLICK, SET_VIDEOS_DURATION, UPDATE_VIDEO_START_TIME, SET_VIDEO_END, REMOVE_VIDEOS } from './constants';

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

export function shouldOpenModal(opened) {
  return {
    type: SHOULD_OPEN_MODAL,
    opened,
  };
}

export function onClick(e) {
  return {
    type: ON_CLICK,
    index: parseInt(e.currentTarget.id, 10),
  };
}

export function setVideoDuration(index, duration) {
  return {
    type: SET_VIDEOS_DURATION,
    index: parseInt(index, 10),
    duration: parseFloat(duration, 10),
  };
}

export function updateVideoStartTime(index, startTime) {
  return {
    type: UPDATE_VIDEO_START_TIME,
    index: parseInt(index, 10),
    startTime: parseFloat(startTime, 10),
  };
}

export function setVideoEnd(index, end) {
  return {
    type: SET_VIDEO_END,
    index: parseInt(index, 10),
    end,
  };
}

export function removeVideos() {
  return {
    type: REMOVE_VIDEOS,
  };
}
