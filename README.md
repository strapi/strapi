# strapi menu plugin dev environment

dev repo for strapi-plugin-menu

## installation & run dev

1. Clone repo

2. Create symlink for custom `strapi-plugin-menu`

```sh
# Macos
ln -s {{ROOT_PATH}}/packages/strapi-plugin-menu {{ROOT_PATH}}/examples/getstarted/plugins/menu

```

```bat
rem Windows
New-Item -ItemType SymbolicLink -Name .\examples\getstarted\plugins\menu -Target .\packages\strapi-plugin-menu\
```

3. Code installation/setup

```sh
# cd {{ROOT_PATH}}/

# cd {{ROOT_PATH}}/examples/getstarted
yarn build
yarn dev # its alias for `yarn develop --watch-admin`

# open URLs:
> http://localhost:8000/admin
> http://127.0.0.1:1337/documentation/v1.0.0
> http://localhost:1337/graphql
```

### windows troubleshooting

set `HOST` env variable for `localhost`

`HOST=127.0.0.0`
