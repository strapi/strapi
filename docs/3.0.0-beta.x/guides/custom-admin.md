# Custom admin

In this guide we will see how you can customize the admin panel.

## Introduction

For this example, we will see two things, the first one will be the customization of the admin panel itself, by updating the content of the `/admin/` home page. And in a second time we will see ho to update the interface of a plugin, by replacing the `date` format in the content manager list view.

First of all, you will have to read the [customization concept](../concepts/customization.md), it will help you to understand how to customize all your application.

## Update the admin home page

If you are following the customization concept, you can already create a `./admin` folder in your application.

### Target the file to update

Then you will have to investigate into the [`strapi-admin`](https://github.com/strapi/strapi/tree/master/packages/strapi-admin) package to find the file that is used to display the admin panel home page.

Here is the [HomePage container](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin/src/containers/HomePage/index.js) you will have to update.

### Eject the file

Let's eject this file to be able to customize it.

**Path —** `./admin/src/containers/HomePage/index.js`

In this new file, paste the current [HomePage container](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin/src/containers/HomePage/index.js) code.

To run your application, you will have to run the `yarn develop --watch-admin` command.

If you visit the admin, nothing will have changed in the home page. And it's normal!

### Customize the file

To keep this example really simple, we will just reduce the HomePage in it's more simple design.

**Path —** `./admin/src/containers/HomePage/index.js`

```js
import React, { memo } from 'react';

import { Block, Container } from './components';

const HomePage = ({ global: { plugins }, history: { push } }) => {
  return (
    <>
      <Container className="container-fluid">
        <div className="row">
          <div className="col-12">
            <Block>Hello World!</Block>
          </div>
        </div>
      </Container>
    </>
  );
};

export default memo(HomePage);
```

Now the admin panel home page should just contain the sentence `Hello Wold!`.

## Update the Content Manager

If you are following the customization concept, you can already create a `./extensions/content-manager` folder in your application.

::: tip

To be able to see the update, you will need to have a Content Type that have a `date` attribute.

:::

### Target the file to update

Then you will have to investigate into the [`strapi-plugin-content-manager`](https://github.com/strapi/strapi/tree/master/packages/strapi-plugin-content-manager) package to find the file that is used to format the date for the list view.

Here is the [Row component](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-content-manager/admin/src/components/CustomTable/Row.js) you will have to update.

### Eject the file

Let's eject the file to be able to customize it.

**Path —** `./extensions/content-manager/admin/src/components/CustomTable/Row.js`

In this new file, paste the current [Row component](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-content-manager/admin/src/components/CustomTable/Row.js) code.

To run your application, you will have to run the `yarn develop --watch-admin` command.

If you visit the entry list view of your content type, nothing will have changed. And it's normal!

### Customize the file

In our example, we want to change the format of the date. We have to find in this file the line that manage the date format.

Here is the code you have to find:

```js
return moment
  .parseZone(date)
  .utc()
  .format('dddd, MMMM Do YYYY');
```

Now let's replace `.format('dddd, MMMM Do YYYY');` by `.format('YYYY/MM/DD');`

And tada, the date will now display with the new format.

## Build the new admin

Well now you have the admin panel you want. But during all the process, the admin panel was updated on the run time because of the command `yarn develop --watch-admin`.

If you start your application using `yarn start` or `yarn develop` the admin will be the old version. Your updates are not applied.

To do so, you have to build the admin panel using the following command `yarn build`.
