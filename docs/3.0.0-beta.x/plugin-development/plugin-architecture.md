# Plugin Folders and Files Architecture

The logic of a plugin is located at its root directory `./plugins/**`. The admin panel related parts of each plugin is contained in the `/admin` folder.
The folders and files structure is the following:

<!-- ```
/plugin
└─── admin // Contains the plugin's front-end
|     └─── src // Source code directory
|          └─── index.js // Entry point of the plugin
|          └─── pluginId.js // Name of the plugin
|          └─── lifecycles.js // File in which the plugin sets the hooks to be ran in another plugin.
|          |
|          └─── components // Contains the list of React components used by the plugin
|          └─── containers
|          |    └─── App // Container used by every others containers
|          |    └─── Initializer // This container is required, it is used to executed logic right after the plugin is mounted.
|          |    └─── HomePage
|          |         └─── action.js // List of Redux actions used by the current container
|          |         └─── constants.js // List of actions constants
|          |         └─── index.js // React component of the current container
|          |         └─── reducer.js // Redux reducer used by the current container
|          |         └─── sagas.js // List of sagas functions
|          |         └─── selectors.js // List of selectors
|          |         └─── styles.scss // Style of the current container
|          |
|          └─── translations // Contains the translations to make the plugin internationalized
|               └─── en.json
|               └─── index.js // File that exports all the plugin's translations.
|               └─── fr.json
└─── config // Contains the configurations of the plugin
|     └─── functions
|     |    └─── bootstrap.js // Asynchronous bootstrap function that runs before the app gets started
|     └─── policies // Folder containing the plugin's policies
|     └─── queries // Folder containing the plugin's models queries
|     └─── routes.json // Contains the plugin's API routes
└─── controllers // Contains the plugin's API controllers
└─── middlewares // Contains the plugin's middlewares
└─── models // Contains the plugin's API models
└─── services // Contains the plugin's API services
``` -->

```bash
plugin/
├── config/ # Contains the configurations of the plugin
│     ├── functions/
│     │    └── bootstrap.js # Asynchronous bootstrap function that runs before the app gets started
│     ├── policies/ # Folder containing the plugin's policies
│     ├── queries/ # Folder containing the plugin's models queries
│     └── routes.json # Contains the plugin's API routes
├── controllers/ # Contains the plugin's API controllers
├── middlewares/ # Contains the plugin's middlewares
├── models/ # Contains the plugin's API models
└── services/ # Contains the plugin's API services
```
