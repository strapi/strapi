# ImmutableJS

Immutable data structures can be deeply compared in no time. This allows us to
efficiently determine if our components need to rerender since we know if the
`props` changed or not!

Check out the [official documentation](https://facebook.github.io/immutable-js/)
for a good explanation of the more intricate benefits it has.

## Usage

In our reducers, we make the initial state an immutable data structure with the
`fromJS` function. We pass it an object or an array, and it takes care of
converting it to a compatible one. (Note: the conversion is performed deeply so
that even arbitrarily nested arrays/objects are immutable stuctures too!)

```JS
import { fromJS } from 'immutable';

const initialState = fromJS({
  myData: 'Hello World!',
});
```

To react to an incoming actions our reducers can use the `.set` and the `.setIn`
functions.

```JS
import { SOME_ACTION } from './actions';

// […]

function myReducer(state = initialState, action) {
  switch (action.type) {
    case SOME_ACTION:
      return state.set('myData', action.payload);
    default:
      return state;
  }
}
```

We use [`reselect`](./reselect.md) to efficiently cache our computed application
state. Since that state is now immutable, we need to use the `.get` and `.getIn`
functions to select the part we want.

```JS
const myDataSelector = (state) => state.get('myData');

export default myDataSelector;
```

To learn more, check out [`reselect.md`](reselect.md)!

## Advanced Usage

ImmutableJS provide many immutable structures like `Map`, `Set` and `List`. But the  downside to using ImmutableJS data structures is that they are not normal JavaScript data structures. 

That means you must use getters to access properties : for instance you'll do `map.get("property")` instead of `map.property`, and `array.get(0)` instead of `array[0]`. It's not natural and your code becoming bigger, you finish by not knowing anymore if you are working with a JavaScript object or an Immutable one. While it's possible to be clear where you are using immutable objects, you still pass them through the system into places where it's not clear. This makes reasoning about functions harder.

The `Record` structure tries to get rid of this drawback. `Record` is like a `Map` whose shape is fixed : you can't later add a new property after the record is created. The benefit of `Record` is that you can now, along with others .get, .set and .merge methods, use the dot notation to access properties, which is a good point to write simpler code.

The creation of a record is less simple. You got to first create the `Record` shape. With the example above, to create your initial state, you'll write :

```JS
//the shape
const StateRecord = Record({
  myData: 'Hello World!',
});

const initialState = new StateRecord({}); // initialState is now a new StateRecord instance
                                          // initialized with myData set by default as 'Hello World!'
```

Now, if you want to access `myData`, you can just write `state.myData` in your reducer code.

