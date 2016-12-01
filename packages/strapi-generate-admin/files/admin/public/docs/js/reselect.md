# `reselect`

reselect memoizes ("caches") previous state trees and calculations based on said
tree. This means repeated changes and calculations are fast and efficient,
providing us with a performance boost over standard `mapStateToProps`
implementations.

The [official documentation](https://github.com/reactjs/reselect)
offers a good starting point!

## Usage

There are two different kinds of selectors, simple and complex ones.

### Simple selectors

Simple selectors are just that: they take the application state and select a
part of it.

```javascript
const mySelector = (state) => state.get('someState');

export {
  mySelector,
};
```

### Complex selectors

If we need to, we can combine simple selectors to build more complex ones which
get nested state parts with reselects `createSelector` function. We import other
selectors and pass them to the `createSelector` call:

```javascript
import { createSelector } from 'reselect';
import mySelector from 'mySelector';

const myComplexSelector = createSelector(
  mySelector,
  (myState) => myState.get('someNestedState')
);

export {
  myComplexSelector,
};
```

These selectors can then either be used directly in our containers as
`mapStateToProps` functions or be nested with `createSelector` once again:

```javascript
export default connect(createSelector(
  myComplexSelector,
  (myNestedState) => ({ data: myNestedState })
))(SomeComponent);
```

### Adding a new selector

If you have a `selectors.js` file next to the reducer which's part of the state
you want to select, add your selector to said file. If you don't have one yet,
add a new one into your container folder and fill it with this boilerplate code:

```JS
import { createSelector } from 'reselect';

const selectMyState = () => createSelector(

);

export {
  selectMyState,
};
```

---

_Don't like this feature? [Click here](remove.md)_
