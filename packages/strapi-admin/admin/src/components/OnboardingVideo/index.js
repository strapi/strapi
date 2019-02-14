/**
 *
 * OnboardingList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { Player } from 'video-react';
import '../../../../node_modules/video-react/dist/video-react.css';

import styles from './styles.scss';

class OnboardingVideo extends React.Component {
  hiddenPlayer = React.createRef();
  player = React.createRef();

  componentDidMount() {
    this.hiddenPlayer.current.subscribeToStateChange(
      this.handleChangeState.bind(this),
    );
  }

  handleChangeState = (state, prevState) => {

    const { duration } = state;
    const { id } = this.props;

    if (duration !== prevState.duration) {
      this.props.setVideoDuration(id, duration);
    }
  };

  afterOpenModal = () => {
    // references are now sync'd and can be accessed.
    console.log('YOYO');

    this.player.current.play();
  };

  /*onModalClose = () => {
    console.log('CLOSE');

    const { player } = this.player.current.getState();
    const currTime = player.currentTime;

    console.log(currTime);
    
  };*/

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
          // onClosed={this.onModalClose}
        >
          <ModalHeader
            toggle={this.props.onClick}
            className={styles.videoModalHeader}
          >
            <FormattedMessage id={video.title} />
          </ModalHeader>
          <ModalBody className={styles.modalBodyHelper}>
            <div>
              <Player
                ref={this.player}
                playsInline
                poster="/assets/poster.png"
                src={video.video}
                preload="auto"
              />
            </div>
          </ModalBody>
        </Modal>
        {!video.duration ? (
          <div className={cn(styles.hiddenPlayerWrapper)}>
            <Player
              ref={this.hiddenPlayer}
              playsInline
              poster="/assets/poster.png"
              src={video.video}
              preload="auto"
              subscribeToStateChange={this.subscribeToStateChange}
            />
          </div>
        ) : (
          <div></div>
        )}
      </li>
    );
  }
}

OnboardingVideo.defaultProps = {
  video: {},
  setVideoDuration: () => {},
};

OnboardingVideo.propTypes = {
  videos: PropTypes.object,
  setVideoDuration: PropTypes.func,
};

export default OnboardingVideo;
