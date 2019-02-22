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
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import OnboardingVideo from 'components/OnboardingVideo';

import { getVideos, onClick, removeVideos, setVideoDuration, setVideoEnd, updateVideoStartTime } from './actions';
import makeSelectOnboarding from './selectors';
import reducer from './reducer';
import saga from './saga';

import styles from './styles.scss';

export class Onboarding extends React.Component {
  state = { showVideos: false, percentage: 0 };

  componentDidMount() {
    this.props.getVideos();
  }

  componentWillReceiveProps(){

    if(!localStorage.getItem('onboarding')) {
      setTimeout(() => { 
        this.setState({ showVideos: true });
        localStorage.setItem('onboarding', true);
      }, 800);
    }
    this.getCompletedPercentage();
  }

  componentWillUnmount() {
    this.props.removeVideos();
    localStorage.removeItem('videos');
  }

  setVideoEnd = () => {
    this.setVideoEnd();
  }

  getCompletedPercentage = () => {

    let videosEnd = 0;
    let videos = JSON.parse(localStorage.getItem('videos'));

    for (let i = 0; i < videos.length; i++) {
      let video = videos[i];

      if (video.end) {
        videosEnd++;
      }
    }

    this.setState({ percentage: Math.floor(videosEnd*100/videos.length)});
  }
  
  didPlayVideo = (index, currTime) => {
    const eventName = `didPlay${index}GetStartedVideo`;
    this.context.emitEvent(eventName, {timestamp: currTime});
  }

  didStopVideo = (index, currTime) => {
    const eventName = `didStop${index}Video`;
    this.context.emitEvent(eventName, {timestamp: currTime});
  }

  handleVideosToggle = () => {
    // Display videos card
    this.setState(prevState => ({ showVideos: !prevState.showVideos }));

    // EmitEvent
    const { showVideos } = this.state;
    const eventName = showVideos ? 'didOpenGetStartedVideoContainer' : 'didCloseGetStartedVideoContainer';
    this.context.emitEvent(eventName);
  };

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
    this.getCompletedPercentage();
  };

  // eslint-disable-line react/prefer-stateless-function
  // eslint-disable-line jsx-handler-names
  render() {
    const { videos, onClick, setVideoDuration } = this.props;

    console.log(videos);
    return (
      <div className={cn(styles.videosWrapper, videos.length > 0 ? styles.visible : styles.hidden)}>
        <div className={cn(styles.videosContent, this.state.showVideos ? styles.shown : styles.hide)}>
          <div className={styles.videosHeader}>
            <p>Get started video</p>
            <p>{this.state.percentage}% completed</p>
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
            onClick={this.handleVideosToggle}
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

Onboarding.defaultProps = {
  onClick: () => {},
  removeVideos: () => {},
  setVideoDuration: () => {},
  setVideoEnd: () => {},
  updateVideoStartTime: () => {},
  videos: [],
};

Onboarding.propTypes = {
  getVideos: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  removeVideos: PropTypes.func,
  setVideoDuration: PropTypes.func,
  setVideoEnd: PropTypes.func,
  updateVideoStartTime: PropTypes.func,
  videos: PropTypes.array,
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
