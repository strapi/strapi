# Upload

Strapi contains a set of tools to upload files.

## Upload config

To change the upload config, edit the `./api/upload/config/settings.json` file.

For the config bellow, please use refer to the `[co-busboy](https://github.com/cojs/busboy)` node module documentation.

```js
{
  "upload": {
    "folder": "public/upload",
    "acceptedExtensions": [
      "*"
    ],
    "headers": {},
    "highWaterMark": "",
    "fileHwm": "",
    "defCharset": "",
    "preservePath": "",
    "limits": {
      "fieldNameSize": "",
      "fieldSize": "",
      "fields": "",
      "fileSize": "",
      "files": "",
      "parts": "",
      "headerPairs": ""
    }
  }
}
```

## Upload service

The upload service allows you to easily upload files from anywhere in your application.

Usage as a promise (yieldable) :

```js
yield strapi.api.upload.services.upload.upload(part, this);
```

## Upload API

The upload API is a simple API which can be used from your client
(front-end, mobile...) application to upload files.

Route used to upload files:

```bash
POST /upload
```

To use this route, you have to submit a HTML form with `multipart/*` enctype
(or fake it if you are using a web front-end framework like AngularJS).

Response payload:

```js
[
  {
    "readable": true,
    "domain": null,
    "truncated": false,
    "fieldname": "file",
    "filename": "1445421755771-image.jpg",
    "encoding": "7bit",
    "transferEncoding": "7bit",
    "mime": "image/jpeg",
    "mimeType": "image/jpeg",
    "originalFilenameFormatted": "image.jpg",
    "originalFilename": "image.jpg",
    "template": "default",
    "lang": "en",
    "createdAt": "2015-10-21T10:02:35.776Z",
    "updatedAt": "2015-10-21T10:02:35.776Z",
    "id": 2
  }
]
```

## Upload model

Each uploaded file description is registered in the database. So you can retrieve
them whenever you want. However, you can disable this option by overriding the
upload service logic.
