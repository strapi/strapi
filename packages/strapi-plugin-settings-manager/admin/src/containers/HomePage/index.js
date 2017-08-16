/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { pluginId, pluginName, pluginDescription } from 'app';
import Button from 'components/Button';

import styles from './styles.scss';
import { loadData } from './actions';
import { makeSelectLoading, makeSelectData } from './selectors';

export class HomePage extends React.Component {
  generateDataBlock() {
    let dataBlock;
    if (this.props.data) {
      const items = this.props.data.map((item, i) => <li key={i}>{item}</li>);
      dataBlock = (
        <div>
          <p>Data:</p>
          <ul>{items}</ul>
        </div>
      );
    }
    return dataBlock;
  }

  render() {
    // Generate the data block
    const dataBlock = this.generateDataBlock();

    // Plugin header config
    const PluginHeader = this.props.exposedComponents.PluginHeader;
    const pluginHeaderTitle = pluginName;
    const pluginHeaderDescription = pluginDescription;

    return (
      <div className={styles.homePage}>
        <PluginHeader
          title={{
            id: `${pluginId}-title`,
            defaultMessage: pluginHeaderTitle,
          }}
          description={{
            id: `${pluginId}-description`,
            defaultMessage: pluginHeaderDescription,
          }}
        />
        <div className="row">
          <div className="col-md-12">
            <p>This is an example orrr f a fake API call.</p>
            <p>Loading: {this.props.loading ? 'yes' : 'no'}.</p>
            {dataBlock}
            <Button
              label={this.props.loading ? 'Loading...' : 'Submit'}
              disabled={this.props.loading}
              onClick={this.props.loadData}
            />
          </div>
        </div>
      </div>
    );
  }
}

HomePage.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

HomePage.propTypes = {
  data: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.object,
  ]),
  exposedComponents: React.PropTypes.object.isRequired,
  loadData: React.PropTypes.func.isRequired,
  loading: React.PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return {
    loadData: () => dispatch(loadData()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
  data: makeSelectData(),
});

export default connect(mapStateToProps, mapDispatchToProps)(
  injectIntl(HomePage)
);
