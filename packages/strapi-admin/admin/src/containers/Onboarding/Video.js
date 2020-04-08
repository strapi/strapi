/**
 *
 * OnboardingList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isNaN } from 'lodash';

import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
import Li from './Li';

/* eslint-disable */

class OnboardingVideo extends React.Component {
  componentDidMount() {
    if (this.hiddenPlayer.current) {
      this.hiddenPlayer.current.subscribeToStateChange(this.handleChangeState);
    }
  }

  hiddenPlayer = React.createRef();

  player = React.createRef();

  handleChangeState = (state, prevState) => {
    const { duration } = state;
    const { id } = this.props;

    if (duration !== prevState.duration && !isNaN(duration)) {
      this.props.setVideoDuration(id, duration);
    }
  };

  handleChangeIsPlayingState = (state, prevState) => {
    const { isActive } = state;
    const { id } = this.props;

    if (isActive !== prevState.isActive && isActive) {
      this.props.didPlayVideo(id, this.props.video.startTime);
    }
  };

  handleCurrentTimeChange = curr => {
    this.props.getVideoCurrentTime(
      this.props.id,
      curr,
      this.props.video.duration
    );
  };

  handleModalOpen = () => {
    this.player.current.subscribeToStateChange(this.handleChangeIsPlayingState);

    this.player.current.play();

    if (this.props.video.startTime === 0) {
      const { player } = this.player.current.getState();
      player.isActive = true;

      this.props.didPlayVideo(this.props.id, this.props.video.startTime);
    } else {
      this.player.current.pause();
    }
  };

  handleVideoPause = () => {
    const { player } = this.player.current.getState();
    const currTime = player.currentTime;

    this.handleCurrentTimeChange(currTime);
    this.props.didStopVideo(this.props.id, currTime);
  };

  handleModalClose = () => {
    const { player } = this.player.current.getState();
    const paused = player.paused;

    if (!paused) {
      this.handleVideoPause();
    }
  };

  getVideoTime = (duration, sign) => {
    const operator = Math.floor(eval(duration + sign + 60));

    if (operator < 10) {
      return `0${operator}`;
    }
    return operator;
  };

  render() {
    const { video } = this.props;
    const time = isNaN(video.duration)
      ? '\xA0'
      : `${Math.floor(video.duration / 60)}:${this.getVideoTime(
          video.duration,
          '%'
        )}`;

    return (
      <Li
        key={this.props.id}
        onClick={this.props.onClick}
        id={this.props.id}
        className={cn(video.end && 'finished')}
      >
        <div className="thumbWrapper">
          <img src={video.preview} alt="preview" />
          <div className="overlay" />
          <div className="play" />
        </div>
        <div className="txtWrapper">
          <p className="title">{video.title}</p>
          <p className="time">{time}</p>
        </div>

        <Modal
          isOpen={video.isOpen}
          toggle={this.props.onClick} // eslint-disable-line react/jsx-handler-names
          className="videoModal"
          onOpened={this.handleModalOpen}
          onClosed={this.handleModalClose}
        >
          <ModalHeader
            toggle={this.props.onClick} // eslint-disable-line react/jsx-handler-names
            className="videoModalHeader"
          >
            {video.title}
          </ModalHeader>
          <ModalBody className="modalBodyHelper">
            <div>
              <Player
                ref={this.player}
                className="videoPlayer"
                src={video.video}
                startTime={video.startTime}
                preload="auto"
                onPause={this.handleVideoPause}
                onplay={this.videoStart}
                subscribeToStateChange={this.subscribeToStateChange}
              />
            </div>
          </ModalBody>
        </Modal>

        {!this.props.video.duration && (
          <div className="hiddenPlayerWrapper">
            <Player
              ref={this.hiddenPlayer}
              src={video.video}
              preload="auto"
              subscribeToStateChange={this.subscribeToStateChange}
            />
          </div>
        )}
      </Li>
    );
  }
}

OnboardingVideo.defaultProps = {
  didPlayVideo: () => {},
  didStopVideo: () => {},
  getVideoCurrentTime: () => {},
  id: 0,
  onClick: () => {},
  setVideoDuration: () => {},
  video: {},
};

OnboardingVideo.propTypes = {
  didPlayVideo: PropTypes.func,
  didStopVideo: PropTypes.func,
  getVideoCurrentTime: PropTypes.func,
  id: PropTypes.number,
  onClick: PropTypes.func,
  setVideoDuration: PropTypes.func,
  video: PropTypes.object,
};

export default OnboardingVideo;
