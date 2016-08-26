# `redux-saga`

`redux-saga` is a library to manage side effects in your application. It works
beautifully for data fetching, concurrent computations and a lot more.
[Sebastien Lorber](https://twitter.com/sebastienlorber) put it best:

> Imagine there is widget1 and widget2. When some button on widget1 is clicked,
  then it should have an effect on widget2. Instead of coupling the 2 widgets
  together (ie widget1 dispatch an action that targets widget2), widget1 only
  dispatch that its button was clicked. Then the saga listen for this button
  click and then update widget2 by dispaching a new event that widget2 is aware of.
>
> This adds a level of indirection that is unnecessary for simple apps, but make
  it more easy to scale complex applications. You can now publish widget1 and
  widget2 to different npm repositories so that they never have to know about
  each others, without having them to share a global registry of actions. The 2
  widgets are now bounded contexts that can live separately. They do not need
  each others to be consistent and can be reused in other apps as well. **The saga
  is the coupling point between the two widgets that coordinate them in a
  meaningful way for your business.**

_Note: It is well worth reading the [source](https://stackoverflow.com/questions/34570758/why-do-we-need-middleware-for-async-flow-in-redux/34623840#34623840)
of this quote in its entirety!_

To learn more about this amazing way to handle concurrent flows, start with the
[official documentation](https://github.com/yelouafi/redux-saga) and explore
some examples! (read [this comparison](https://stackoverflow.com/questions/34930735/pros-cons-of-using-redux-saga-with-es6-generators-vs-redux-thunk-with-es7-async/34933395) if you're used to `redux-thunk`)

## Usage

Sagas are associated with a container, just like actions, constants, selectors
and reducers. If your container already has a `sagas.js` file, simply add your
saga to that. If your container does not yet have a `sagas.js` file, add one with
this boilerplate structure:

```JS
import { take, call, put, select } from 'redux-saga/effects';

// Your sagas for this container
export default [
  sagaName,
];

// Individual exports for testing
export function* sagaName() {

}
```

Then, in your `routes.js`, add injection for the newly added saga:

```JS
getComponent(nextState, cb) {
  const importModules = Promise.all([
    System.import('containers/YourComponent/reducer'),
    System.import('containers/YourComponent/sagas'),
    System.import('containers/YourComponent'),
  ]);

  const renderRoute = loadModule(cb);

  importModules.then(([reducer, sagas, component]) => {
    injectReducer('home', reducer.default);
    injectSagas(sagas.default); // Inject the saga

    renderRoute(component);
  });

  importModules.catch(errorLoading);
},
```

Now add as many sagas to your `sagas.js` file as you want!

---

_Don't like this feature? [Click here](remove.md)_
