# File Upload

Thanks to the plugin `Upload`, you can upload any kind of files on your server or externals providers such as AWS S3.

## Usage

The plugin exposes a single route `POST /upload` to upload one or multiple files in a single request.

> ⚠️  Please send the request using multipart/form-data encoding

**Parameters**

- `files`: The file(s) to upload. The value(s) can be a Buffer or Stream.
- `refId`: (optional): The ID of the entry which the file(s) will be linked to.
- `ref`: (optional): The name of the model which the file(s) will be linked to (see more below).
- `source`: (optional): The name of the plugin where the model is located.
- `field`: (optional): The field of the entry which the file(s) will be precisely linked to.


#### Examples

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
  "info": {
    "name": "user",
    "description": "This represents the User Model"
  },
  "attributes": {
    "firstname": {
      "type": "string"
    },
    "lastname": {
      "type": "string"
    },
    "email": {
      "type": "email",
      "required": true,
      "unique": true
    },
    "password": {
      "type": "password",
      "required": true,
      "private": true
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
