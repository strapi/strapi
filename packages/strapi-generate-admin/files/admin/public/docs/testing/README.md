# Testing

- [Unit Testing](unit-testing.md)
- [Component Testing](component-testing.md)
- [Remote Testing](remote-testing.md)

Testing your application is a vital part of serious development. There are a few
things you should test. If you've never done this before start with [unit testing](unit-testing.md).
Move on to [component testing](component-testing.md) when you feel like you
understand that!

We also support [remote testing](remote-testing.md) your local application,
which is quite awesome, so definitely check that out!

## Usage with this boilerplate

To test your application started with this boilerplate do the following:

1. Sprinkle `.test.js` files directly next to the parts of your application you
   want to test. (Or in `test/` subdirectories, it doesn't really matter as long
   as they are directly next to those parts and end in `.test.js`)

1. Write your unit and component tests in those files.

1. Run `npm run test` in your terminal and see all the tests pass! (hopefully)

There are a few more commands related to testing, checkout the [commands documentation](../general/commands.md#testing)
for the full list!
