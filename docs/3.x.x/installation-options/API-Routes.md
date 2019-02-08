# Api Routes

### List entries (GET)

To retrieve the list of posts, use the `GET /posts` route.

Generated APIs provide a handy way to filter and order queries. In that way, ordering posts by price is as easy as `GET http://localhost:1337/posts?_sort=price:asc`. For more informations, read the [filters documentation](../guides/filters.md).

Here is an example using Axios:

```js
import axios from 'axios';

// Request API.
axios
  .get('http://localhost:1337/posts', {
    params: {
      _sort: 'createdAt:desc', // Generates http://localhost:1337/posts?_sort=createdAt:desc
    },
  })
  .then(response => {
    // Handle success.
    console.log('Well done, here is the list of posts: ', response.data);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Get a specific entry (GET)

If you want to get a specific entry, add the `id` of the wanted post at the end of the url.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .get(`http://localhost:1337/posts/${postId}`)
  .then(response => {
    // Handle success.
    console.log('Well done, here is the post: ', response.data);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Create data (POST)

Use the `POST` route to create a new entry.

Example with Axios:

```js
import axios from 'axios';

// Request API.
axios
  .post(`http://localhost:1337/posts/`, {
    title: 'My new post',
  })
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully created: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Update data (PUT)

Use the `PUT` route to update an existing entry.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .put(`http://localhost:1337/posts/${postId}`, {
    title: 'Updated title',
  })
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully updated: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Delete data (DELETE)

Use the `DELETE` route to delete an existing entry.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .delete(`http://localhost:1337/posts/${postId}`)
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully updated: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

---

#### 👏 Congratulations!

You successfully finished the Getting Started guide! Read the [concepts section](../concepts/concepts.md) to understand more deeply how to use and customize Strapi.

Also, feel free to join the community thanks to the different channels listed in the [community page](http://strapi.io/community): team members, contributors and developers will be happy to help you.
