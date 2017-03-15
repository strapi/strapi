/*
 * HomePage
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import Container from 'components/Container';
import { injectIntl } from 'react-intl';

import styles from './styles.scss';

export class HomePage extends React.Component {
  render() {
    const PluginHeader = this.props.exposedComponents.PluginHeader;

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader title={{
            id: 'plugin-content-manager-title',
            defaultMessage: 'Content Manager'
          }} description={{
            id: 'plugin-content-manager-description',
            defaultMessage: 'A powerful UI to easily manage your data.'
          }} noActions={true}>
          </PluginHeader>
          <Container>
            <p>Nothing to do here.</p>
            <p>To edit your content's entries go to the specific link in the left menu.</p>
          </Container>
        </div>
      </div>
    );
  }
}

export function mapDispatchToProps() {
  return {};
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(HomePage));
