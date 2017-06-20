/*
 * Home
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import messages from './messages.json';
import { FormattedMessage } from 'react-intl';
import { define } from 'i18n';
define(messages);

import Container from 'components/Container';

import styles from './styles.scss';

export class Home extends React.Component {
  render() {
    const PluginHeader = this.props.exposedComponents.PluginHeader;

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader
            title={{
              id: 'plugin-content-manager-title',
              defaultMessage: 'Content Manager',
            }}
            description={messages.pluginHeaderDescription}
          />
          <Container>
            <p>
              <FormattedMessage {...messages.introduction}/>
            </p>
          </Container>
        </div>
      </div>
    );
  }
}

Home.propTypes = {
  exposedComponents: React.PropTypes.object.isRequired,
};

export function mapDispatchToProps() {
  return {};
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(Home);
