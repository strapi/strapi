/*
 * HomePage
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import Container from 'components/Container';
import { injectIntl } from 'react-intl';

import {
  defaultLoad,
} from './actions';

import {
  selectName
} from './selectors';


export class HomePage extends React.Component {

  componentDidMount() {
    this.props.onDefault();
  }

  render() {
    return (
      <div>
        <div className="container">
          // <PluginHeader {...this.props}></PluginHeader>
          <Container>
            {this.props.name}
          </Container>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {};

export function mapDispatchToProps(dispatch) {
  return {
    onDefault: () => dispatch(defaultLoad()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  name: selectName()
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(HomePage));
