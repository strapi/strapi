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
import PopUpVideo from 'components/PopUpVideo';
import { Player } from 'video-react';
import '../../../../node_modules/video-react/dist/video-react.css';

import styles from './styles.scss';
import auth from 'utils/auth';

class OnboardingList extends React.Component {
  player = React.createRef();

  componentDidMount() {
    //console.log(this.player.current);
    this.player.current.subscribeToStateChange(
      this.handleChangeState.bind(this),
    );
  }

  handleChangeState = (state, prevState) => {
    //console.log({ state, prevState });

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

  render() {
    const content = this.props.video.isOpen ? 'yo' : 'ya';
    const { video } = this.props;

    //getVideoDuration = e => {};

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
          <p className={styles.time}>{this.props.video.duration}</p>
        </div>

        {/* <PopUpVideo video={video.video} /> */}

        <Modal
          isOpen={video.isOpen}
          toggle={this.props.onClick}
          className={styles.modalPosition}
          onOpened={this.afterOpenModal}
          onClosed={this.afterOpenModal}
        >
          <ModalHeader
            toggle={this.props.onClick}
            className={styles.popUpWarningHeader}
          >
            <FormattedMessage id={video.title} />
          </ModalHeader>
          <ModalBody className={styles.modalBodyHelper}>
            <div>
              {/* <Player
                playsInline
                poster="/assets/poster.png"
                src={video.video}
              /> */}
            </div>
          </ModalBody>
        </Modal>

        <div
          className={cn(
            styles.playerWrapper,
            video.isOpen ? styles.visible : '',
          )}
        >
          <Player
            ref={this.player}
            playsInline
            poster="/assets/poster.png"
            src={video.video}
            preload="auto"
            subscribeToStateChange={this.subscribeToStateChange}
          />
        </div>
      </li>
    );
  }
}

OnboardingList.defaultProps = {
  video: {},
  setVideoDuration: () => {},
};

OnboardingList.propTypes = {
  videos: PropTypes.object,
};

export default OnboardingList;
