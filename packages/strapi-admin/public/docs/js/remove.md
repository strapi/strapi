## Removing `redux-saga`

**We don't recommend removing `redux-saga`**, as we strongly feel that it's the
way to go for most redux based applications.

If you really want to get rid of it, delete the `sagas/` folder, remove the
`import` and the `sagaMiddleware` from the `store.js` and finally remove it from
the `package.json`. Then you should be good to go with whatever side-effect
management library you want to use!

## Removing `reselect`

To remove `reselect`, delete the `app/selectors` folder, remove it from your
dependencies in `package.json` and then write your `mapStateToProps` functions
like you normally would!

You'll also need to hook up the history directly to the store. Change the const
`history` in `app/app.js` to the following:

```js
const history = syncHistoryWithStore(browserHistory, store, {
  selectLocationState: (state) => state.get('route').toJS(),
});
```
