# Getting Started with Jekyll

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Jekyll](https://jekyllrb.com) remains the same except that you will not fetch the same content.

### Create a Jekyll app

Create a basic Jekyll application. [Installation](https://jekyllrb.com/).

```bash
jekyll new jekyll-app
```

### Configure Jekyll

Jekyll is a [Static Site Generator](https://www.staticgen.com/) and will fetch your content from Strapi at build time. You need to configure Jekyll to communicate with your Strapi application.

- Add `jekyll-strapi` to your `Gemfile`

```
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-strapi"
end
```

  - Add `jekyll-strapi` to your plugins in `_config.yml`.

```yml
plugins:
  - jekyll-feed
  - jekyll-strapi
```

  - Add the configuration of Strapi at the end of the `_config.yml`.

```yml
strapi:
  # Your API endpoint (optional, default to http://localhost:1337)
  endpoint: http://localhost:1337
  collections:
    restaurants:
      type: restaurants

    categories:
      type: categories
```

  - Run `bundle install` to install your gems.

```bash
bundle install
```

### GET Request your collection type

Execute a `GET` request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.

### Example

`./_layouts/home.html`

```html
---
layout: default
---

<div class="home">
  <h1 class="page-heading">Restaurants</h1>
  {%- if strapi.collections.restaurants.size > 0 -%}
  <ul>
    {%- for restaurant in strapi.collections.restaurants -%}
    <li>
      {{ restaurant.name }}
    </li>
    {%- endfor -%}
  </ul>
  {%- endif -%}
</div>
```

Execute a `GET` request on the `category` Collection Type in order to fetch a specific category with all the associated restaurants.

Be sure that you activated the `findOne` permission for the `category` Collection Type.

### Example

`./layouts/index.html`

```js
---
layout: default
---

<div class="home">
    {%- if strapi.collections.categories[0].restaurants.size > 0 -%}
    <h1 class="page-heading">{{ strapi.collections.categories[0].name }}</h1>
    <ul>
        {%- for restaurant in strapi.collections.categories[0].restaurants -%}
        <li>
            {{ restaurant.name }}
        </li>
        {%- endfor -%}
    </ul>
    {%- endif -%}
</div>
```

Run your application with:

```bash
bundle exec jekyll serve
```

We can generate pages for each category.

- Tell Jekyll to generate a page for each category by updating the `_config.yml` file with the following:

```yaml
strapi:
  # Your API endpoint (optional, default to http://localhost:1337)
  endpoint: http://localhost:1337
  # Collections, key is used to access in the strapi.collections
  # template variable
  collections:
    # Example for a "posts" collection
    restaurants:
      # Collection name (optional). Used to construct the url requested. Example: type `foo` would generate the following url `http://localhost:1337/foo`.
      type: restaurants

    categories:
      # Collection name (optional). Used to construct the url requested. Example: type `foo` would generate the following url `http://localhost:1337/foo`.
      type: categories
      permalink: categories/:name
      layout: category.html
      # Generate output files or not (default: false)
      output: true
```

- Create a `_layouts/category.html` file that will display the content of each one of your category:

```html
<h1>{{ page.document.name }}</h1>
<ul>
  {%- for restaurant in page.document.restaurants -%}
  <li>
    {{ restaurant.name }}
  </li>
  {%- endfor -%}
</ul>
```

After building your application, you'll be able to see a `category` folder in your `_site` folder.

You can find your restaurant categories by browsing `http://localhost:4000/category/<name-of-category>`.

Feel free to do the same for your restaurants!

## Conclusion

Here is how to request your Collection Types in Strapi using Jekyll.
Learn more about Jekyll with their [official documentation](https://jekyllrb.com/docs/).
