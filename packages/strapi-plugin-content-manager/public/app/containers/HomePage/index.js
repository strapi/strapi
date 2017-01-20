/*
 * HomePage
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import Container from 'components/Container';
import { injectIntl } from 'react-intl';

import styles from './styles.scss';

import {
  load,
} from './actions';

import {
  selectName
} from './selectors';

export class HomePage extends React.Component {

  componentWillMount() {
    this.props.load();
  }

  render() {
    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <Container>
            <p>Nothing to do here.</p>
            <p>To edit your content's entries go to the specific link in the left menu.</p>
          </Container>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {};

export function mapDispatchToProps(dispatch) {
  return {
    load: () => {
      console.log('dispatch LOAD');
      dispatch(load());
    }
  };
}

const mapStateToProps = createStructuredSelector({
  name: selectName()
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(HomePage));
