# Upload

Thanks to the plugin `Upload`, you can upload any kind of files on your server or externals providers such as **AWS S3**.

## Endpoints

<style lang="stylus">
#endpoint-table
  table
    display table
    width 100%

  tr
    border none
    &:nth-child(2n)
      background-color white

  tbody
    tr
      border-top 1px solid #dfe2e5

  th, td
    border none
    padding 1.2em 1em
    border-right 1px solid #dfe2e5
    &:last-child
      border-right none
</style>

<div id="endpoint-table">

| Method | Path              | Description         |
| :----- | :---------------- | :------------------ |
| GET    | /upload/files     | Get a list of files |
| GET    | /upload/files/:id | Get a specific file |
| POST   | /upload           | Upload files        |
| DELETE | /upload/files/:id | Delete a file       |

</div>

## Upload files

To upload files into your application.

### Parameters

- `files`: The file(s) to upload. The value(s) can be a Buffer or Stream.

### Code example

```html
<form>
  <!-- Can be multiple files -->
  <input type="file" name="files" />
  <input type="submit" value="Submit" />
</form>

<script type="text/javascript">
  const formElement = document.querySelector('form');

  formElement.addEventListener('submit', e => {
    e.preventDefault();

    const request = new XMLHttpRequest();

    request.open('POST', '/upload');

    request.send(new FormData(formElement));
  });
</script>
```

::: warning
You have to send FormData in your request body
:::

## Upload files related to an entry

To upload files that will be linked to an specific entry.

### Request parameters

- `files`: The file(s) to upload. The value(s) can be a Buffer or Stream.
- `path` (optional): The folder where the file(s) will be uploaded to (only supported on strapi-provider-upload-aws-s3).
- `refId`: The ID of the entry which the file(s) will be linked to.
- `ref`: The name of the model which the file(s) will be linked to (see more below).
- `source` (optional): The name of the plugin where the model is located.
- `field`: The field of the entry which the file(s) will be precisely linked to.

### Examples

The `Restaurant` model attributes:

```json
"attributes": {
  "name": {
    "type": "string"
  },
  "cover": {
    "model": "file",
    "via": "related",
    "plugin": "upload"
  }
}
```

Code

```html
<form>
  <!-- Can be multiple files if you setup "collection" instead of "model" -->
  <input type="file" name="files" />
  <input type="text" name="ref" value="restaurant" />
  <input type="text" name="refId" value="5c126648c7415f0c0ef1bccd" />
  <input type="text" name="field" value="cover" />
  <input type="submit" value="Submit" />
</form>

<script type="text/javascript">
  const formElement = document.querySelector('form');

  formElement.addEventListener('submit', e => {
    e.preventDefault();

    const request = new XMLHttpRequest();

    request.open('POST', '/upload');

    request.send(new FormData(formElement));
  });
</script>
```

::: warning
You have to send FormData in your request body
:::

## Upload file during entry creation

You can also add files during your entry creation.

### Examples

The `Restaurant` model attributes:

```json
"attributes": {
  "name": {
    "type": "string"
  },
  "cover": {
    "model": "file",
    "via": "related",
    "plugin": "upload"
  }
}
```

Code

```html
<form>
  <!-- Can be multiple files if you setup "collection" instead of "model" -->
  <input type="text" name="name" />
  <input type="file" name="cover" />
  <input type="submit" value="Submit" />
</form>

<script type="text/javascript">
  const formElement = document.querySelector('form');

  formElement.addEventListener('submit', e => {
    e.preventDefault();

    const request = new XMLHttpRequest();

    const formData = new FormData();

    const formElements = formElement.elements;

    const data = {};

    for (let i = 0; i < formElements.length; i++) {
      const currentElement = formElements[i];
      if (!['submit', 'file'].includes(currentElement.type)) {
        data[currentElement.name] = currentElement.value;
      } else if (currentElement.type === 'file') {
        if (currentElement.files.length === 1) {
          const file = currentElement.files[0];
          formData.append(`files.${currentElement.name}`, file, file.name);
        } else {
          for (let i = 0; i < currentElement.files.length; i++) {
            const file = currentElement.files[i];

            formData.append(`files.${currentElement.name}`, file, file.name);
          }
        }
      }
    }

    formData.append('data', JSON.stringify(data));

    request.open('POST', `${HOST}/restaurants`);

    request.send(formData);
  });
</script>
```

You entry data have to be contained in a `data` key. You have to `JSON.stringify` your data object.

And for your files, they have to be prefixed by `files`.
Example here with cover attribute `files.cover`.

::: tip
If you want to upload files for a component, you will have to specify the index of the item you want to add the file.
Example `files.my_component_name[the_index].attribute_name`
:::

::: warning
You have to send FormData in your request body
:::

## Models definition

Adding a file attribute to a model (or the model of another plugin) is like adding a new association.

In the first example below, you will be able to upload and attach one file to the avatar attribute.

**Path —** `User.settings.json`.

```json
{
  "connection": "default",
  "attributes": {
    "pseudo": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "email",
      "required": true,
      "unique": true
    },
    "avatar": {
      "model": "file",
      "via": "related",
      "plugin": "upload"
    }
  }
}
```

In our second example, you can upload and attach multiple pictures to the restaurant.

**Path —** `Restaurant.settings.json`.

```json
{
  "connection": "default",
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "convers": {
      "collection": "file",
      "via": "related",
      "plugin": "upload"
    }
  }
}
```

## Install providers

By default Strapi provides a local file upload system. You might want to upload your files on AWS S3 or another provider.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-upload-)

To install a new provider run:

```
$ npm install strapi-provider-upload-aws-s3@beta --save
```

::: tip
If the provider is not in the mono repo, you probably don't need `@beta` depending if the creator published it with this tag or not.
:::

Then, visit [http://localhost:1337/admin/plugins/upload/configurations/development](http://localhost:1337/admin/plugins/upload/configurations/development) on your web browser and configure the provider.

::: tip
Some providers may have additional settings such as the AWS S3 needs an API endpoint URL. You can find a list of these for AWS [here](https://docs.aws.amazon.com/general/latest/gr/ses.html)
:::

## Create providers

If you want to create your own, make sure the name starts with `strapi-provider-upload-` (duplicating an existing one will be easier to create), modify the `auth` config object and customize the `upload` and `delete` functions.

To use it you will have to publish it on **npm**.

### Create a local provider

If you want to create your own provider without publishing it on **npm** you can follow these steps:

- Create a `providers` folder in your application.
- Create your provider as explained in the documentation eg. `./providers/strapi-provider-upload-[...]/...`
- Then update your `package.json` to link your `strapi-provider-upload-[...]` dependency to the [local path](https://docs.npmjs.com/files/package.json#local-paths) of your new provider.

```json
{
  ...
  "dependencies": {
    ...
    "strapi-provider-upload-[...]": "file:providers/strapi-provider-upload-[...]",
    ...
  }
}
```

- Finally, run `yarn install` or `npm install` to install your new custom provider.
