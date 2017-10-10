# Consume your API

Let's say you created a Product API with name, description and float fields.

## List entries

To retrieve the list of products, use `GET /your-content-type` route.

Generated APIs provides a handy way to filter and order queries. That way, ordering products by price is as easy as `GET http://localhost:1337/product?_order=price:asc`. For more information, read the [filters documentation](todo.md).

Here is an example using jQuery.

```js
$.ajax({
  type: 'GET',
  url: 'http://localhost:1337/product_order=price:asc', // Order by price.
  done: function(products) {
    console.log('Well done, here is the list of products: ', products);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Get a specific entry

If you want to get a specific entry, add the `id` of the wanted product at the end of the url.

```js
$.ajax({
  type: 'GET',
  url: 'http://localhost:1337/product/123', // Where `123` is the `id` of the product.
  done: function(product) {
    console.log('Well done, here is the product having the `id` 123: ', product);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Create data (POST)

Use the `POST` route to create a new entry.

jQuery example:

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/product',
  data: {
    name: 'Cheese cake',
    description: 'Chocolate cheese cake with ice cream',
    price: 5
  },
  done: function(product) {
    console.log('Congrats, your product has been successfully created: ', product); // Remember the product `id` for the next steps.
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Update data (PUT)

Use the `PUT` route to update an existing entry.

jQuery example:

```js
$.ajax({
  type: 'PUT',
  url: 'http://localhost:1337/product/123', // Where `123` is the `id` of the product.
  data: {
    description: 'This is the new description'
  },
  done: function(product) {
    console.log('Congrats, your product has been successfully updated: ', product.description);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Delete data (DELETE)

Use the `DELETE` route to delete an existing entry.

jQuery example:

```js
$.ajax({
  type: 'DELETE',
  url: 'http://localhost:1337/product/123', // Where `123` is the `id` of the product.
  done: function(product) {
    console.log('Congrats, your product has been successfully deleted: ', product);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

***

Congratulations! You successfully finished the Getting Started guide! Read the [documentation](../admin.md) to understand more advanced concepts.

Also, feel free to join the community thanks to the different channels listed in the [community page](/community): team members, contributors and developers will be happy to help you.
