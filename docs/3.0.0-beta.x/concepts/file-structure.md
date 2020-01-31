# Files structure

By default, your project's structure will look like this:

- `/.cache`: contains files used to build your admin panel.
- [`/admin`](../admin-panel/customization.md): contains your admin customization files.
- `/api`: contains the business logic of your project split in sub-folder per API.
  - `**`
    - `/config`: contains the API's configurations ([`routes`](./routing.md), [`policies`](./policies.md), etc).
    - [`/controllers`](./controllers.md): contains the API's custom controllers.
    - [`/models`](./models.md): contains the API's models.
    - [`/services`](./services.md): contains the API's custom services.
- `/build`: contains your admin panel UI build.
- [`/config`](./configurations.md)
  - [`/environments`](./configurations.md#environments): contains the project's configurations per environment.
    - `/**`
      - `/development`
        - [`custom.json`](./configurations.md#custom): contains the custom configurations for this environment.
        - [`database.json`](./configurations.md#database): contains the database connections for this environment.
        - [`request.json`](./configurations.md#request): contains the request settings for this environment.
        - [`response.json`](./configurations.md#response): contains the response settings for this environment.
        - [`server.json`](./configurations.md#server): contains the server settings for this environment.
      - `/production`
      - `/staging`
  - [`/functions`](./configurations.md#functions): contains lifecycle or generic functions of the project.
    - [`bootstrap.js`](./configurations.md#bootstrap): contains the code executed at the application start.
    - [`cron.js`](./configurations.md#cron-tasks): contains the cron tasks.
  - [`application.json`](./configurations.md#application): contains the general configurations of the project.
  - [`custom.json`](./configurations.md#custom): contains the custom configurations of the project.
  - [`hook.json`](./configurations.md#hook): contains the hook settings of the project.
  - [`middleware.json`](./configurations.md#middleware): contains the middleware settings of the project.
- [`/extensions`](./customization.md): contains the files to extend installed plugins.
- [`/hooks`](./hooks.md): contains the custom hooks of the project.
- [`/middlewares`](./middlewares.md): contains the custom middlewares of the project.
- [`/plugins`](./plugins.md): contains your local plugins.
- [`/public`](./public-assets.md): contains the file accessible to the outside world.
- `/node_modules`: contains the npm's packages used by the project.
