# CSS Modules

With CSS Modules, all class names are locally scoped by default. This means
no more bugs from classname clashes. Being able to compose primitives to build
up behaviour also lets us bring programming best practice to CSS: DRY, reusable,
modular code FTW!

For a detailed explanation see the
[official documentation](https://github.com/css-modules/css-modules).

## Usage

Write your CSS normally in the `styles.css` file in the component folder.

```css
/* styles.css */

.saveBtn {
  composes: btn from '../components/btn'; // Yay for composition!

  background-color: green;
  color:            white;
}
```

Then `import` the CSS file in your component JavaScript file, and reference the
class name in the `className` prop.

```javascript
// index.js

import styles from './styles.css';

// ...inside the render()...

return (
  <button className={ styles.saveBtn }>
    Save!
  </button>
);
```

## Integrating Global CSS

Because class names in CSS Modules are locally scoped by default, there is some
additional setup and consideration that must be taken to work correctly with 
traditional global CSS.

Let's use [Bootstrap](http://getbootstrap.com/) as an example.  First of all,
because we are in the React environment, it is widely recommended to not use
the Javascript code that is packaged with Bootstrap, but rather to re-write that
code in a React-friendly way.  Thankfully
[react-bootstrap](https://react-bootstrap.github.io/) exists which provides
components built using the native Bootstrap CSS classes.  But because these
components are built using the native global CSS, even with react-bootstrap
there is the need to deal with global CSS.  As an additional constraint for
this example, let's use npm and webpack to manage our dependencies so that
there is no need to manually add any script tags to `index.html`.

### Preparation
Edit `package.json` and make the following modifications
```
  "dllPlugin": {
    ...
    "exclude": [
      "bootstrap-css-only",
      ...
    ],
    ...
  },
  "dependencies": {
    ...
    "bootstrap-css-only": "3.3.6",
    "react-bootstrap": "0.30.0",
    ...
  },
```
The `exclude` configuration change is necessary to ensure that the dllPlugin build
process does not attempt to parse the global CSS.  If you do not do this
there will be an error during the build process and you will not be able to
run the application.

Now edit `internals/config.js` and make the following modifications
```javascript
const ReactBoilerplate = {
  /* ... */
  dllPlugin: {
    defaults: {
      /* ... */
      exclude: [
        'bootstrap-css-only',
        /* ... */
      ],

      /* ... */
};
```

And finally edit `app/app.js`, and add the following after the line `import 'sanitize.css/sanitize.css';`
```javascript
import 'bootstrap-css-only/css/bootstrap.min.css';
```

### Usage

There are multiple approaches you can use to apply and override the global CSS.

You can apply the global styles directly.
```javascript
<div className="container-fluid"></div>
```

You can apply global styles implicitly via `react-bootstrap`.
```javascript
<Grid fluid></div>
```

You can override global styles in your CSS module.
```css
:global .container-fluid {
  margin-left: 20px;
}
```

Or you can add overrides via another local scope and
[classnames](https://github.com/JedWatson/classnames).
```css
.localContainer {
  margin-left: 20px;
}
```
```javascript
import styles from './styles.css';
import classNames from 'classnames';
<div className={ classNames('container-fluid', styles.localContainer) }></div>
```

Doing the same via `react-bootstrap`.
```javascript
import styles from './styles.css';
<Grid fluid className={ styles.localContainer }></Grid>
```

---

_Don't like this feature? [Click here](remove.md)_
