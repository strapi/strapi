# Component testing

[Unit testing your Redux actions and reducers](unit-testing.md) is nice, but you
can do even more to make sure nothing breaks your application. Since React is
the _view_ layer of your app, let's see how to test Components too!

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Shallow rendering](#shallow-rendering)
- [Enzyme](#enzyme)

<!-- /TOC -->

## Shallow rendering

React provides us with a nice add-on called the Shallow Renderer. This renderer
will render a React component **one level deep**. Lets take a look at what that
means with a simple `<Button>` component...

This component renders a `<button>` element containing a checkmark icon and some
text:

```javascript
// Button.react.js

import CheckmarkIcon from './CheckmarkIcon.react';

function Button(props) {
  return (
    <button className="btn" onClick={props.onClick}>
      <CheckmarkIcon />
      { React.Children.only(props.children) }
    </button>
  );
}

export default Button;
```

_Note: This is a [state**less** ("dumb") component](../js/README.md#architecture-components-and-containers)_

It might be used in another component like this:

```javascript
// HomePage.react.js

import Button from './Button.react';

class HomePage extends React.Component {
  render() {
    return(
      <Button onClick={this.doSomething}>Click me!</Button>
    );
  }
}
```

_Note: This is a [state**ful** ("smart") component](../js/README.md#architecture-components-and-containers)!_

When rendered normally with the standard `ReactDOM.render` function, this will
be the HTML output
(*Comments added in parallel to compare structures in HTML from JSX source*):

```html
<button>                           <!-- <Button>             -->
  <i class="fa fa-checkmark"></i>  <!--   <CheckmarkIcon />  -->
  Click Me!                        <!--   { props.children } -->
</button>                          <!-- </Button>            -->
```

Conversely, when rendered with the shallow renderer, we'll get a String
containing this "HTML":

```html
<button>              <!-- <Button>             -->
  <CheckmarkIcon />   <!--   NOT RENDERED!      -->
  Click Me!           <!--   { props.children } -->
</button>             <!-- </Button>            -->
```

If we test our `Button` with the normal renderer and there's a problem
with the `CheckmarkIcon` then the test for the `Button` will fail as well...
but finding the culprit will be hard. Using the _shallow_ renderer, we isolate
the problem's cause since we don't render any other components other than the
one we're testing!

The problem with the shallow renderer is that all assertions have to be done
manually, and you cannot do anything that needs the DOM.

Thankfully, [AirBnB](https://twitter.com/AirbnbEng) has open sourced their
wrapper around the React shallow renderer and jsdom, called `enzyme`. `enzyme`
is a testing utility that gives us a nice assertion/traversal/manipulation API.

## Enzyme

Lets test our `<Button>` component! We're going to assess three things: First,
that it renders a HTML `<button>` tag, second that it renders its children we
pass it and third that handles clicks!

This is our Mocha setup:

```javascript
describe('<Button />', () => {
  it('renders a <button>', () => {});

  it('renders its children', () => {});

  it('handles clicks', () => {});
});
```

Lets start with testing that it renders a `<button>`. To do that we first
`shallow` render it, and then `expect` that a `<button>` node exists.

```javascript
it('renders a <button>', () => {
  const renderedComponent = shallow(
    <Button></Button>
  );
  expect(
    renderedComponent.find("button").node
  ).toExist();
});
```

Nice! If somebody breaks our button component by having it render an `<a>` tag
or something else we'll immediately know! Let's do something a bit more advanced
now, and check that our `<Button>` renders its children.

We render our button component with some text, and then verify that our text
exists:

```javascript
it('renders its children', () => {
  const text = "Click me!";
  const renderedComponent = shallow(
    <Button>{ text }</Button>
  );
  expect(
    renderedComponent.contains(text)
  ).toEqual(true);
});
```

Great! Onwards to our last and most advanced test: checking that our `<Button>` handles clicks correctly. We'll use a Spy for that. A Spy is a
function that knows if, and how often, it has been called. We create the Spy
(thoughtfully provided by `expect`), pass _it_ as the `onClick` handler to our
component, simulate a click on the rendered `<button>` element and, lastly,
see that our Spy was called:

```javascript
it('handles clicks', () => {
  const onClickSpy = expect.createSpy();
  const renderedComponent = shallow(<Button onClick={onClickSpy} />);
  renderedComponent.find('button').simulate('click');
  expect(onClickSpy).toHaveBeenCalled();
});
```

And that's how you unit test your components and make sure they work correctly!
