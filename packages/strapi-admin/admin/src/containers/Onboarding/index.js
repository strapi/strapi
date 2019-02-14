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
import { getVideos, onClick } from './actions';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import makeSelectOnboarding from './selectors';
import reducer from './reducer';
import saga from './saga';

import OnboardingVideo from 'components/OnboardingList';

import styles from './styles.scss';
import auth from 'utils/auth';

export class Onboarding extends React.Component {
  state = { showVideos: false };

  componentWillMount() {
    this.setState({ showVideos: true });
    this.props.getVideos();

    localStorage.setItem('videos', JSON.stringify(['video0', 'video1']));
    console.log(localStorage.getItem('videos'));

    if (auth.get('videos')) {
      console.log('localStorageExist');
      console.log(auth.get('videos'));
    } else {
      console.log('localStorageNoooo');
      auth.set('videos', JSON.stringify(['video0', 'video1']), true);
      //localStorage.setItem('videos', stringify(['video0', 'video1']));
    }
  }

  toggleVideos = e => {
    this.setState({ showVideos: !this.state.showVideos });
  };

  // eslint-disable-line react/prefer-stateless-function
  render() {
    const { videos, onClick } = this.props;
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
  return bindActionCreators({ getVideos, onClick }, dispatch);
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
