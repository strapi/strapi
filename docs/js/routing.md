# Routing via `react-router` and `react-router-redux`

`react-router` is the de-facto standard routing solution for react applications.
The thing is that with redux and a single state tree, the URL is part of that
state. `react-router-redux` takes care of synchronizing the location of our
application with the application state.

(See the [`react-router-redux` documentation](https://github.com/reactjs/react-router-redux)
for more information)

## Usage

To add a new route, use the generator with `npm run generate route`.

This is what a standard (generated) route looks like for a container:

```JS
{
  path: '/',
  name: 'home',
  getComponent(nextState, cb) {
    const importModules = Promise.all([
      System.import('containers/HomePage')
    ]);

    const renderRoute = loadModule(cb);

    importModules.then(([component]) => {
      renderRoute(component);
    });

    importModules.catch(errorLoading);
  },
}
```

To go to a new page use the `push` function by `react-router-redux`:

```JS
import { push } from 'react-router-redux';

dispatch(push('/some/page'));
```

## Child Routes
`npm run generate route` does not currently support automatically generating child routes if you need them, but they can be easily created manually.

For example, if you have a route called `about` at `/about` and want to make a child route called `team` at `/about/our-team` you can just add that child page to the parent page's `childRoutes` array like so:

```JS
/* your app's other routes would already be in this array */
{
  path: '/about',
  name: 'about',
  getComponent(nextState, cb) {
    const importModules = Promise.all([
      System.import('containers/AboutPage'),
    ]);

    const renderRoute = loadModule(cb);

    importModules.then(([component]) => {
      renderRoute(component);
    });

    importModules.catch(errorLoading);
  },
  childRoutes: [
    {
      path: '/about/our-team',
      name: 'team',
      getComponent(nextState, cb) {
        const importModules = Promise.all([
          System.import('containers/TeamPage'),
        ]);

        const renderRoute = loadModule(cb);

        importModules.then(([component]) => {
          renderRoute(component);
        });

        importModules.catch(errorLoading);
      },
    },
  ]
}
```

## Dynamic routes

To go to a dynamic route such as 'post/:slug' eg 'post/cool-new-post', firstly add the route to your `routes.js`, as per documentation:

```JS
path: '/posts/:slug',
name: 'post',
getComponent(nextState, cb) {
 const importModules = Promise.all([
   System.import('containers/Post/reducer'),
   System.import('containers/Post/sagas'),
   System.import('containers/Post'),
 ]);

 const renderRoute = loadModule(cb);

 importModules.then(([reducer, sagas, component]) => {
   injectReducer('post', reducer.default);
   injectSagas(sagas.default);
   renderRoute(component);
 });

 importModules.catch(errorLoading);
},
```

###Container:

```JSX
<Link to={`/posts/${post.slug}`} key={post._id}>
```

Clickable link with payload (you could use push if needed).

###Action:

```JS
export function getPost(slug) {
  return {
    type: LOAD_POST,
    slug,
  };
}

export function postLoaded(post) {
  return {
    type: LOAD_POST_SUCCESS,
    podcast,
  };
}
```

###Saga:

```JS
const { slug } = yield take(LOAD_POST);
yield call(getXhrPodcast, slug);

export function* getXhrPodcast(slug) {
  const requestURL = `http://your.api.com/api/posts/${slug}`;
  const post = yield call(request, requestURL);
  if (!post.err) {
    yield put(postLoaded(post));
  } else {
    yield put(postLoadingError(post.err));
  }
}
```

Wait (`take`) for the LOAD_POST constant, which contains the slug payload from the `getPost()` function in actions.js. 

When the action is fired then dispatch the `getXhrPodcast()` function to get the reponse from your api. On success dispatch the `postLoaded()` action (`yield put`) which sends back the reponse and can be added into the reducer state.


You can read more on [`react-router`'s documentation](https://github.com/reactjs/react-router/blob/master/docs/API.md#props-3).
