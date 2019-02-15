/**
 *
 * OnboardingList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { Player } from 'video-react';
import '../../../../node_modules/video-react/dist/video-react.css';

import styles from './styles.scss';

class OnboardingVideo extends React.Component {
  hiddenPlayer = React.createRef();
  player = React.createRef();

  componentDidMount() {
    this.hiddenPlayer.current.subscribeToStateChange(
      this.handleChangeState,
    );
  }

  handleChangeState = (state, prevState) => {
    const { duration } = state;
    const { id } = this.props;

    if (duration !== prevState.duration) {
      this.props.setVideoDuration(id, duration);
    }
  };

  handleCurrentTimeChange = (curr) => {

    this.props.getVideoCurrentTime(this.props.id, curr);            
  }

  afterOpenModal = () => {
    this.player.current.play();
  };

  onModalClose = () => {

    const { player } = this.player.current.getState();
    const currTime = player.currentTime;
    this.handleCurrentTimeChange(currTime);
  };

  render() {
    const { video } = this.props;

    return (
      <li
        key={this.props.id}
        onClick={this.props.onClick}
        id={this.props.id}
        className={cn(styles.listItem, video.end ? styles.finished : '')}
      >
        <div className={styles.thumbWrapper}>
          <img src={video.preview} />
          <div className={styles.play} />
        </div>
        <div className={styles.txtWrapper}>
          <p className={styles.title}>{video.title}</p>
          <p className={styles.time}>{isNaN(video.duration) ? ' ' :  `${Math.floor(video.duration / 60)}:${Math.floor(video.duration)%60}`}</p>
        </div>

        <Modal
          isOpen={video.isOpen}
          toggle={this.props.onClick}
          className={styles.videoModal}
          onOpened={this.afterOpenModal}
          onClosed={this.onModalClose}
        >
          <ModalHeader
            toggle={this.props.onClick}
            className={styles.videoModalHeader}
          >
            {video.title}
          </ModalHeader>
          <ModalBody className={styles.modalBodyHelper}>
            <div>
              <Player
                ref={this.player}
                poster="/assets/poster.png"
                src={video.video}
                startTime={video.startTime}
                preload="auto"
              />
            </div>
          </ModalBody>
        </Modal>
        {!video.duration && (
          <div className={cn(styles.hiddenPlayerWrapper)}>
            <Player
              ref={this.hiddenPlayer}
              poster="/assets/poster.png"
              src={video.video}
              preload="auto"
              subscribeToStateChange={this.subscribeToStateChange}
            />
          </div>
        )}
      </li>
    );
  }
}

OnboardingVideo.defaultProps = {
  currTime: 0,
  video: {},
  setVideoDuration: () => {},
  getVideoCurrentTime: () => {},
};

OnboardingVideo.propTypes = {
  currTime: PropTypes.number,
  videos: PropTypes.object,
  setVideoDuration: PropTypes.func,
  getVideoCurrentTime: PropTypes.func,
};

export default OnboardingVideo;
