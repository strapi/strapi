# Change the logo of the login page

In order to change the logo of the login page follow these steps:

### 1 Add your new logo in your `./my-project/admin/src/<mylogo>.png`'s folder project (the location doesn't matter)

### 2 Create a configuration file:

**`Path: ./my-project/admin/src/config.js`**

```js
import MyLogo from './<mylogo>.png';

export const LOGIN_LOGO = MyLogo;
export const SHOW_TUTORIALS = true;
```

### 3 Rebuild your app

```js
# Using yarn

yarn build

# Using npm

npm run build
```
