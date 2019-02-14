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
import { getVideos, onClick, setVideoDuration } from './actions';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import makeSelectOnboarding from './selectors';
import reducer from './reducer';
import saga from './saga';

import OnboardingVideo from 'components/OnboardingVideo';

import styles from './styles.scss';

export class Onboarding extends React.Component {
  state = { showVideos: false, videosTime: [] };

  componentWillMount() {
    this.setState({ showVideos: true });

    if (!localStorage.getItem('videos')) {
      localStorage.setItem('videos', JSON.stringify([0,0,0,0]));
    }

    this.props.getVideos();
  }

  toggleVideos = e => {
    this.setState({ showVideos: !this.state.showVideos });
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

Onboarding.propTypes = {
  getVideos: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectOnboarding();

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ getVideos, onClick, setVideoDuration }, dispatch);
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
