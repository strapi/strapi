/**
 *
 * Onboarding
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { getVideos, onClick, setVideoDuration, updateVideoStartTime, setVideoEnd, removeVideos } from './actions';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import makeSelectOnboarding from './selectors';
import reducer from './reducer';
import saga from './saga';

import OnboardingVideo from 'components/OnboardingVideo';

import styles from './styles.scss';

export class Onboarding extends React.Component {
  state = { showVideos: false };

  componentDidMount() {
    this.setState({ showVideos: true });
    this.props.getVideos();
  }
  
  componentWillUnmount() {
    this.props.removeVideos();
    localStorage.removeItem('videos');
  }

  toggleVideos = () => {
    // Display videos card
    this.setState(prevState => ({ showVideos: !prevState.showVideos }));

    // EmitEvent
    const { showVideos } = this.state;
    const eventName = showVideos ? 'didOpenGetStartedVideoContainer' : 'didCloseGetStartedVideoContainer';
    this.context.emitEvent(eventName);
  };

  setVideoEnd = () => {
    this.setVideoEnd();
  }

  didPlayVideo = (index, currTime) => {

    const eventName = `didPlay${index}GetStartedVideo`;
    this.context.emitEvent(eventName, {timestamp: currTime});
  }

  didStopVideo = (index, currTime) => {

    const eventName = `didStop${index}Video`;
    this.context.emitEvent(eventName, {timestamp: currTime});
  }

  updateLocalStorage = (index, current, duration) => {
    // Update store
    this.props.updateVideoStartTime(index, current);

    // Update localStorage
    let videosTime = JSON.parse(localStorage.getItem('videos'));
    videosTime[index].startTime = current;

    let percent = current * 100 / duration;
    if (percent >= 80) {
      if (videosTime[index].end === false) {
        videosTime[index].end = true;
        this.props.setVideoEnd(index, true);
      }
    }

    localStorage.setItem('videos', JSON.stringify(videosTime));
  };

  // eslint-disable-line react/prefer-stateless-function
  render() {
    const { videos, onClick, setVideoDuration } = this.props;

    return (
      <div className={styles.videosWrapper}>
        <div
          className={cn(
            styles.videosContent,
            this.state.showVideos ? styles.shown : styles.hide,
          )}
        >
          <div className={styles.videosHeader}>
            <p>Get started video</p>
            <p>25% completed</p>
          </div>

          <ul className={styles.onboardingList}>
            {videos.map((video, i) => {
              return (
                <OnboardingVideo
                  key={i}
                  id={i}
                  video={video}
                  onClick={onClick}
                  setVideoDuration={setVideoDuration}
                  getVideoCurrentTime={this.updateLocalStorage}
                  didPlayVideo={this.didPlayVideo}
                  didStopVideo={this.didStopVideo}
                />
              );
            })}
          </ul>
        </div>

        <div className={styles.openBtn}>
          <button
            onClick={this.toggleVideos}
            className={this.state.showVideos ? styles.active : ''}
          >
            <i className="fa fa-question" />
            <i className="fa fa-times" />
            <span />
          </button>
        </div>
      </div>
    );
  }
}
Onboarding.contextTypes = {
  emitEvent: PropTypes.func,
};

Onboarding.propTypes = {
  getVideos: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectOnboarding();

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ getVideos, onClick, setVideoDuration, updateVideoStartTime, setVideoEnd, removeVideos }, dispatch);
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

/* Remove this line if the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withReducer = injectReducer({ key: 'onboarding', reducer });

/* Remove the line below the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withSaga = injectSaga({ key: 'onboarding', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Onboarding);
