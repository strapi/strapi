# File Upload

::: warning
This feature requires the Upload plugin (installed by default).
:::

Thanks to the plugin `Upload`, you can upload any kind of files on your server or externals providers such as AWS S3.

## Usage

The plugin exposes a single route `POST /upload` to upload one or multiple files in a single request.

::: warning
Please send FormData in your request body
:::

**Parameters**

- `files`: The file(s) to upload. The value(s) can be a Buffer or Stream.
- `path`: (optional): The folder where the file(s) will be uploaded to (only supported on strapi-provider-upload-aws-s3 now).
- `refId`: (optional): The ID of the entry which the file(s) will be linked to.
- `ref`: (optional): The name of the model which the file(s) will be linked to (see more below).
- `source`: (optional): The name of the plugin where the model is located.
- `field`: (optional): The field of the entry which the file(s) will be precisely linked to.

## Models

To add a new file attribute in your models, it's like adding a new association. In the first example, you will be able to upload and attach one file to the avatar attribute. Whereas, in our second example, you can upload and attach multiple pictures to the product.

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

**Path —** `Product.settings.json`.
```json
{
  "connection": "default",
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "price": {
      "type": "integer",
      "required": true
    },
    "pictures": {
      "collection": "file",
      "via": "related",
      "plugin": "upload"
    }
  }
}
```

## Examples

**JS example**

The `Article` attributes:

```json
"attributes": {
  "title": {
    "default": "",
    "type": "string"
  },
  "cover": {
    "model": "file",
    "via": "related",
    "plugin": "upload",
    "required": false
  }
}
```

Code example:

```html
<form>
  <!-- Can be multiple files -->
  <input type="file" name="files">
  <input type="text" name="ref" value="article">
  <input type="text" name="refId" value="5c126648c7415f0c0ef1bccd">
  <input type="text" name="field" value="cover">
  <input type="submit" value="Submit">
</form>

<script type="text/javascript">
  const formElement = document.querySelector('form');

  formElement.addEventListener('submit', (e) => {
    e.preventDefault();

    const request = new XMLHttpRequest();

    request.open('POST', '/upload');

    request.send(new FormData(formElement));
  });
</script>
```

> ⚠️  You have to send a FormData in any case (React, Angular, jQuery etc...)

**Single file**

```
curl -X POST -F 'files=@/path/to/pictures/file.jpg' http://localhost:1337/upload
```

**Multiple files**

```
curl -X POST -F 'files[]=@/path/to/pictures/fileX.jpg' -F 'files[]=@/path/to/pictures/fileY.jpg' http://localhost:1337/upload
```

**Linking files to an entry**

Let's say that you want to have a `User` model provided by the plugin `Users & Permissions` and you want to upload an avatar for a specific user.

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


```js
{
  "files": "...", // Buffer or stream of file(s)
  "path": "user/avatar", // Uploading folder of file(s).
  "refId": "5a993616b8e66660e8baf45c", // User's Id.
  "ref": "user", // Model name.
  "source": "users-permissions", // Plugin name.
  "field": "avatar" // Field name in the User model.
}
```

Here the request to make to associate the file (/path/to/pictures/avatar.jpg) to the user (id: 5a993616b8e66660e8baf45c) when the `User` model is provided by the `Users & Permissions` plugin.
```
curl -X POST -F 'files=@/path/to/pictures/avatar.jpg&refId=5a993616b8e66660e8baf45c&ref=user&source=users-permissions&field=avatar' http://localhost:1337/upload
```

## Install providers

By default Strapi provides a local file upload system. You might want to upload your files on AWS S3 or another provider.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-upload-)

To install a new provider run:

```
$ npm install strapi-provider-upload-aws-s3@alpha --save
```

::: note
If the provider is not in the mono repo, you probably not need `@alpha` depending if the creator published it with this tag or not.
:::

Then, visit `/admin/plugins/upload/configurations/development` on your web browser and configure the provider.

## Create providers

If you want to create your own, make sure the name starts with `strapi-provider-upload-` (duplicating an existing one will be easier to create), modify the `auth` config object and customize the `upload` and `delete` functions.
