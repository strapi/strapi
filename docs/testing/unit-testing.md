# Unit testing

Unit testing is the practice of testing the smallest possible *units* of our
code, functions. We run our tests and automatically verify that our functions
do the thing we expect them to do. We assert that, given a set of inputs, our
functions return the proper values and handle problems.

This boilerplate uses the [Mocha](https://github.com/mochajs/mocha) test
framework to run the tests and [expect](http://github.com/mjackson/expect) for
assertions. These libraries make writing tests as easy as speaking - you
`describe` a unit of your code and `expect` `it` to do the correct thing.

<!-- TOC depthFrom:2 depthTo:4 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Basics](#basics)
	- [Mocha](#mocha)
	- [expect](#expect)
- [Testing Redux Applications](#testing-redux-applications)
	- [Reducers](#reducers)
		- [rewire](#rewire)
	- [Actions](#actions)

<!-- /TOC -->

We use this glob pattern to find unit tests `app/**/*.test.js` - this tells
mocha to run all files that end with `.test.js` anywhere within the `app`
folder. Use this to your advantage, and put unit tests next to the files you
want to test so relevant files stay together!

Imagine a navigation bar, this is what its folder might look like:

```
NavBar                   # Wrapping folder
├── NavBar.css           # Styles
├── NavBar.react.js      # Actual component
├── NavBar.actions.js    # Actions
├── NavBar.constants.js  # Constants
├── NavBar.reducer.js    # Reducer
└── test                        # Folder of tests
    ├── NavBar.actions.test.js  # Actions tests
    └── NavBar.reducer.test.js  # Reducer tests
```

## Basics

For the sake of this guide, lets pretend we're testing this function. It's
situated in the `add.js` file:

```javascript
// add.js

export function add(x, y) {
  return x + y;
}
```

> Note: The `export` here is ES6 syntax, and you will need an ES6 transpiler
  (e.g. babel.js) to run this JavaScript.

> The `export` exports our function as a module, which we can `import` and use
  in other files. Continue below to see what that looks like.

### Mocha

Mocha is our unit testing framework. Its API, which we write tests with, is
speech like and easy to use.

> Note: This is the [official documentation](http://mochajs.org) of Mocha.

We're going to add a second file called `add.test.js` with our unit tests
inside. Running said unit tests requires us to enter `mocha add.test.js` into
the command line.

First, we `import` the function in our `add.test.js` file:

```javascript
// add.test.js

import { add } from './add.js';
```

Second, we `describe` our function:

```javascript
describe('add()', () => {

});
```

> Note: `(arg1, arg2) => { }` is ES6 notation for anonymous functions, i.e. is
the same thing as `function(arg1, arg2) { }`

Third, we tell Mocha what `it` (our function) should do:

```javascript
describe('add()', () => {
  it('adds two numbers', () => {

  });

  it('doesnt add the third number', () => {

  });
});
```

That's the entire Mocha part! Onwards to the actual tests.

### expect

Using expect, we `expect` our little function to return the same thing every
time given the same input.

> Note: This is the [official documentation](https://github.com/mjackson/expect) for expect.

First, we have to import `expect` at the top of our file, before the tests:

```javascript
import expect from 'expect';

describe('add()', () => {
  // [...]
});
```

We're going to test that our little function correctly adds two numbers first.
We are going to take some chosen inputs, and `expect` the result `toEqual` the
corresponding output:

```javascript
// [...]
it('adds two numbers', () => {
  expect(add(2, 3)).toEqual(5);
});
// [...]
```

Lets add the second test, which determines that our function doesn't add the
third number if one is present:

```javascript
// [...]
it('doesnt add the third number', () => {
 expect(add(2, 3, 5)).toEqual(add(2, 3));
});
// [...]
```

> Note: Notice that we call `add` in `toEqual`. I won't tell you why, but just
  think about what would happen if we rewrote the expect as `expect(add(2, 3, 5)).toEqual(5)`
  and somebody broke something in the add function. What would this test
  actually... test?

Should our function work, Mocha will show this output when running the tests:

```
add()
  ✓ adds two numbers
  ✓ doesnt add the third number
```

Lets say an unnamed colleague of ours breaks our function:

```javascript
// add.js

export function add(x, y) {
  return x * y;
}
```

Oh no, now our function doesn't add the numbers anymore, it multiplies them!
Imagine the consequences to our code that uses the function!

Thankfully, we have unit tests in place. Because we run the unit tests before we
deploy our application, we see this output:

```
add()
  1) adds two numbers
  ✓ doesnt add the third number

  1) add adds two numbers:
    Error: Expected 6 to equal 5
```

This tells us that something is broken in the add function before any users get
the code! Congratulations, you just saved time and money!

## Testing Redux Applications

This boilerplate uses Redux, partially because it turns our data flow into
testable (pure) functions. Let's go back to our `NavBar` component from above,
and see what testing the actions and the reducer of it would look like.

This is what our `NavBar` actions look like:

```javascript
// NavBar.actions.js

import { TOGGLE_NAV } from './NavBar.constants.js';

export function toggleNav() {
  return { type: TOGGLE_NAV };
}
```

with this reducer:

```javascript
// NavBar.reducer.js

import { TOGGLE_NAV } from './NavBar.constants.js';

const initialState = {
  open: false
};

function NavBarReducer(state = initialState, action) {
  switch (action.type) {
    case TOGGLE_NAV:
      return Object.assign({}, state, {
        open: !state.open
      });
    default:
      return state;
  }
}

export default NavBarReducer;
```

Lets test the reducer first!

### Reducers

First, we have to import `expect`, the reducer and the constant.

```javascript
// NavBar.reducer.test.js

import expect from 'expect';
import NavBarReducer from '../NavBar.reducer';
import { TOGGLE_NAV } from '../NavBar.constants';
```

Then we `describe` the reducer, and add two tests: we check that it returns the
initial state and that it handles the `toggleNav` action.

```javascript
describe('NavBarReducer', () => {
  it('returns the initial state', () => {

  });

  it('handles the toggleNav action', () => {

  });
});
```

Lets write the tests themselves! Since the reducer is just a function, we can
call it like any other function and `expect` the output to equal something.

To test that it returns the initial state, we call it with a state of `undefined`
(the first argument), and an empty action (second argument). The reducer should
return the initial state of the `NavBar`, which is

```javascript
{
  open: false
}
```

Lets put that into practice:

```javascript
describe('NavBarReducer', () => {
  it('returns the initial state', () => {
    expect(NavBarReducer(undefined, {})).toEqual({
      open: false
    });
  });

  it('handles the toggleNav action', () => {

  });
});
```

This works, but we have one problem: We also test the initial state itself. When
somebody changes the initial state, this test will fail, even though the reducer
correctly returns the initial state.

To fix that, we have to `import` the initial state from the reducer file and
check that the reducer returns that. This has one problem: Our initial state
isn't `export`ed.

Now, you might be thinking "Ha! easy: simply add an `export` before the
`const initialState` in the reducer and boom!"... But in fact we _don't_ want
to do that because it's an internal (or "private") property of that module
alone and shouldn't really be accessible from the outside at all.

This is where the `rewire` module comes in handy.

#### rewire

Rewire allows us to access properties we normally couldn't via special
`__get__` and `__set__` methods it injects into modules.

Start by `import`ing rewire **at the top** of your test file:

```javascript
// `NavBar.reducer.test.js`

import expect from 'expect';
import rewire from 'rewire';
import NavBarReducer from '../NavBar.reducer';
import { TOGGLE_NAV } from '../NavBar.constants';

const initialState = NavBarReducer.__get__('initialState');
```

> Note: You might be wondering why we still `import` the `NavBarReducer` above.
  The `NavBarReducer` imported with `rewire` isn't the _actual_ reducer, it's a
  `rewire`d version.

Now we can really see whether the `NavBarReducer` returns the initial state if
no action is passed!

```javascript
it('returns the initial state', () => {
  expect(NavBarReducer(undefined, {})).toEqual(initialState);
});
```

w00t, we fixed the test!

> For more information on Rewire, see the [official documentation](https://github.com/jhnns/rewire)

Lets see how we can test actions next.

### Actions

We have one action `toggleNav` that changes the `NavBar` open state.

A Redux action is a pure function, so testing it isn't more difficult than
testing our `add` function from the first part of this guide!

The first step is to import the action to be tested, the constant it should
return and `expect`:

```javascript
// NavBar.actions.test.js

import { toggleNav } from '../NavBar.actions';
import { TOGGLE_NAV } from '../NavBar.constants';
import expect from 'expect';
```

Then we `describe` the actions:

```javascript
describe('NavBar actions', () => {
  describe('toggleNav', () => {
    it('should return the correct constant', () => {

    });
  });
});
```

> Note: `describe`s can be nested, which gives us nice output, as we'll see later.

And the last step is to add the assertion:

```javascript
it('should return the correct constant', () => {
  expect(toggleNav()).toEqual({
    type: TOGGLE_NAV
  });
});
```

If our `toggleNav` action works correctly, this is the output Mocha will show us:

```
NavBar actions
  toggleNav
    ✓ should return the correct constant
```

And that's it, we now know when somebody breaks the `toggleNav` action!

*Continue to learn how to test your application with [Component Testing](component-testing.md)!*
