/**
 *
 * App.react.js
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { selectPlugins } from './selectors';
import { registerPlugin } from './actions';

import styles from './styles.css';

export class App extends React.Component { // eslint-disable-line react/prefer-stateless-function

  static propTypes = {
    children: React.PropTypes.node,
  };

  render() {
    // Plugins list
    const pluginsList = this.props.plugins;

    // Generate the list of plugins jsx
    const plugins = pluginsList.map(plugin => <li>{plugin.name}</li>);

    return (
      <div className={styles.container}>
        <button onClick={this.props.onRegisterPluginClicked}>Register plugin</button>
        <p>Plugins</p>
        <ul>
          {plugins}
        </ul>
        {React.Children.toArray(this.props.children)}
      </div>
    );
  }
}

App.propTypes = {
  plugins: React.PropTypes.object,
  onRegisterPluginClicked: React.PropTypes.func,
};

const mapStateToProps = createSelector(
  selectPlugins(),
  (plugins) => ({ plugins })
);

function mapDispatchToProps(dispatch) {
  return {
    onRegisterPluginClicked: () => dispatch(registerPlugin({ name: 'New Plugin' })),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
