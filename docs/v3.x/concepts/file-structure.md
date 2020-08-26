# Files structure

By default, your project's structure will look like this:

- `/.cache`: contains files used to build your admin panel.
- [`/admin`](../admin-panel/customization.md): contains your admin customization files.
- `/api`: contains the business logic of your project split into sub-folders per API.
  - `**`
    - `/config`: contains the API's configurations ([`routes`](./routing.md), [`policies`](./policies.md), etc.).
    - [`/controllers`](./controllers.md): contains the API's custom controllers.
    - [`/models`](./models.md): contains the API's models.
    - [`/services`](./services.md): contains the API's custom services.
- `/build`: contains your admin panel UI build.
- [`/config`](./configurations.md)
  - [`/functions`](./configurations.md#functions): contains lifecycle or generic functions of the project.
    - [`/responses`](./configurations.md#responses): contains custom responses.
      - [`404.js`](./configurations.md#404): contains a template for constructing your custom 404 message.
    - [`bootstrap.js`](./configurations.md#bootstrap): contains the code executed at the application start.
    - [`cron.js`](./configurations.md#cron-tasks): contains the cron tasks.
  - [`server.js`](./configurations.md#server): contains the general configurations of the project.
  - [`database.js`](./configurations.md#database): contains the database configurations of the project.
- [`/extensions`](./customization.md): contains the files to extend installed plugins.
- [`/hooks`](./hooks.md): contains the custom hooks of the project.
- [`/middlewares`](./middlewares.md): contains the custom middlewares of the project.
- [`/plugins`](./plugins.md): contains your local plugins.
- [`/public`](./public-assets.md): contains the files accessible to the outside world.
- `/node_modules`: contains the npm packages used by the project.
