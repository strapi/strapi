# Customizing the Admin leftMenu

You can choose which *Content Types* you want to display in the admin.

For example if you want to display only the `user` content type you have to edit the `layout.js` file located in
`my-project/admin/config/layout.js` as follows:

```js
module.exports = {
  contentTypesToShow: [
    {
      label: '',
      destination: 'user'
    }
  ],
};
```
