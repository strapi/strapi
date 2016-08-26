
// /**
//  * Gets the repositories of the user from Github
//  */
//
// import { take, call, put, select, fork, cancel } from 'redux-saga/effects';
// import { LOCATION_CHANGE } from 'react-router-redux';
// import { REGISTER_PLUGIN } from 'containers/App/constants';
//
// import { getAsyncInjectors } from 'utils/asyncInjectors';
// // const { injectReducer, injectSagas } = getAsyncInjectors(store); // eslint-disable-line no-unused-vars
// import { Router, Route, Link } from 'react-router'
//
// /**
//  * Register plugin
//  */
// export function* registerPlugin() {
//
// }
//
// /**
//  * Watches for REGISTER_PLUGIN action and calls handler
//  */
// export function* getPluginsWatcher() {
//   yield call(registerPlugin);
// }
//
// /**
//  * Root saga manages watcher lifecycle
//  */
// export function* pluginData() {
//   // Fork watcher so we can continue execution
//   const watcher = yield fork(getPluginsWatcher);
//
//   // Suspend execution until location changes
//   yield take(LOCATION_CHANGE);
//   yield cancel(watcher);
// }
//
// // Bootstrap sagas
// export default [
//   pluginData,
// ];
