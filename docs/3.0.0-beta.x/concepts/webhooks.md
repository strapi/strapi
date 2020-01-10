# Webhooks

## What is a webhook

A webhook is a way for an application to notify other applications that an event occured.
Using a webhook is a good way to tell third party providers to start some processing (CI, build, deployment...).

The way a webhook works is by delivering informations to a receiving application through HTTP requests (typically POST requests).

## How to use

### Create a webhook

### Test a webhook

### Enabled and disable a webhook

### Update a webhook

### Delete a webhook

## Webhooks payloads and events

By default strapi webhook can be trigger by the following events:

- Entry creation
- Entry edition
- Entry deletion
- Media creation
- Media deletion

### Entry created

This event is created when a new entry

**payload**

```json
{
  "event": "entry.create",
  "created_at": "2020-01-10T08:47:36.649Z",
  "model": "address",
  "entry": {
    "id": 1,
    "geolocation": {},
    "city": "Paris",
    "postal_code": null,
    "category": null,
    "full_name": "Paris",
    "created_at": "2020-01-10T08:47:36.264Z",
    "updated_at": "2020-01-10T08:47:36.264Z",
    "cover": null,
    "images": []
  }
}
```

### Entry updated

**payload**

```json
{
  "event": "entry.update",
  "created_at": "2020-01-10T08:58:26.563Z",
  "model": "address",
  "entry": {
    "id": 1,
    "geolocation": {},
    "city": "Paris",
    "postal_code": null,
    "category": null,
    "full_name": "Paris",
    "created_at": "2020-01-10T08:47:36.264Z",
    "updated_at": "2020-01-10T08:58:26.210Z",
    "cover": null,
    "images": []
  }
}
```

### Entry deleted

**payload**

```json
{
  "event": "entry.delete",
  "created_at": "2020-01-10T08:59:35.796Z",
  "model": "address",
  "entry": {
    "id": 1,
    "geolocation": {},
    "city": "Paris",
    "postal_code": null,
    "category": null,
    "full_name": "Paris",
    "created_at": "2020-01-10T08:47:36.264Z",
    "updated_at": "2020-01-10T08:58:26.210Z",
    "cover": null,
    "images": []
  }
}
```

### Media created (uploaded)

This event is triggered when you upload a file on entry creation or through the media interface.

**payload**

```json
{
  "event": "media.create",
  "created_at": "2020-01-10T10:58:41.115Z",
  "media": {
    "id": 1,
    "name": "image.png",
    "hash": "353fc98a19e44da9acf61d71b11895f9",
    "sha256": "huGUaFJhmcZRHLcxeQNKblh53vtSUXYaB16WSOe0Bdc",
    "ext": ".png",
    "mime": "image/png",
    "size": 228.19,
    "url": "/uploads/353fc98a19e44da9acf61d71b11895f9.png",
    "provider": "local",
    "provider_metadata": null,
    "created_at": "2020-01-10T10:58:41.095Z",
    "updated_at": "2020-01-10T10:58:41.095Z",
    "related": []
  }
}
```

### Media deleted

This event is triggered only when you delete a media through the media interface.

**payload**

```json
{
  "event": "media.delete",
  "created_at": "2020-01-10T11:02:46.232Z",
  "media": {
    "id": 11,
    "name": "photo.png",
    "hash": "43761478513a4c47a5fd4a03178cfccb",
    "sha256": "HrpDOKLFoSocilA6B0_icA9XXTSPR9heekt2SsHTZZE",
    "ext": ".png",
    "mime": "image/png",
    "size": 4947.76,
    "url": "/uploads/43761478513a4c47a5fd4a03178cfccb.png",
    "provider": "local",
    "provider_metadata": null,
    "created_at": "2020-01-07T19:34:32.168Z",
    "updated_at": "2020-01-07T19:34:32.168Z",
    "related": []
  }
}
```

## Securing your webhooks

## Developer use

### Architecture

![Webhooks architecture diagram](../assets/concepts/diagram-architecture.png)

### Available configurations

### Programmatic use
