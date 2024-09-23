---
title: App Template
tags:
  - testing
  - e2e
  - template
  - infrastructure
---

## Overview

An app template has been created in `e2e/app-template` which provide some customizations and utilities to allow the tests to run. Note that if any changes are made to the app template, you will need to run `yarn test:e2e:clean` to update the test apps with the new template.

Here you can read about what content schemas the test instance has & the API customisations we've built (incl. why we built them).

## Update the app template

To update the app template:

- run the tests to create a Strapi app based on the existing template at `test-apps/e2e/test-app-<number>`.
- Move into this folder and run `yarn develop`.
- Login using the credentials found in `e2e/constants.js`.
- Make any changes you need (i.e. create a content-type).
- Replace the existing template in `e2e/app-template` with the current folder content (only keep the files you need).

## Content Schemas

### Article

```json
{
  // ...
  "attributes": {
    "title": {
      "type": "string"
    },
    "content": {
      "type": "blocks"
    },
    "authors": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::author.author",
      "inversedBy": "articles"
    }
  }
  // ...
}
```

### Author

```json
{
  // ...
  "attributes": {
    "name": {
      "type": "string"
    },
    "profile": {
      "allowedTypes": ["images", "files", "videos", "audios"],
      "type": "media",
      "multiple": false
    },
    "articles": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::article.article",
      "mappedBy": "authors"
    }
  }
  // ...
}
```

### Homepage (Single Type)

```json
{
  // ...
  "attributes": {
    "title": {
      "type": "string"
    },
    "content": {
      "type": "blocks"
    },
    "admin_user": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "admin::user"
    },
    "seo": {
      "type": "component",
      "repeatable": false,
      "component": "meta.seo"
    }
  }
  // ...
}
```

### Product

This collection type is internationalized.

```json
{
  // ...
  "attributes": {
    "name": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "string",
      "required": true
    },
    "slug": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "isAvailable": {
      "pluginOptions": {
        "i18n": {
          "localized": false
        }
      },
      "type": "boolean",
      "default": true,
      "required": true
    },
    "description": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "blocks"
    },
    "images": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images", "files", "videos", "audios"],
      "pluginOptions": {
        "i18n": {
          "localized": false
        }
      }
    },
    "seo": {
      "type": "component",
      "repeatable": false,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "component": "meta.seo"
    },
    "sku": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "integer",
      "unique": true
    },
    "variations": {
      "type": "component",
      "repeatable": true,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "component": "product.variations"
    }
  }
  // ...
}
```

### Shop (Single Type)

This single type is internationalized.

```json
{
  // ...
  "attributes": {
    "title": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "string",
      "required": true
    },
    "content": {
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "type": "dynamiczone",
      "components": [
        "page-blocks.product-carousel",
        "page-blocks.hero-image",
        "page-blocks.content-and-image"
      ],
      "required": true,
      "min": 2
    },
    "seo": {
      "type": "component",
      "repeatable": false,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "component": "meta.seo"
    }
  }
  // ...
}
```

### Upcoming Match (Single Type)

```json
{
  // ...
  "attributes": {
    "title": {
      "type": "string"
    },
    "number_of_upcoming_matches": {
      "type": "integer"
    },
    "next_match": {
      "type": "date"
    }
  }
  // ...
}
```

## API Customisations

### Config

found at `template/src/api/config`

#### Rate Limit

##### Usage

```ts
async function toggleRateLimiting(page, enabled = true) {
  await page.request.fetch('/api/config/ratelimit/enable', {
    method: 'POST',
    data: { value: enabled },
  });
}
```

##### What does it do?

This endpoint can be used to enable or disable the rate limitting middleware in
strapi. When enabled login requests for each user are limitted to 5 in 5 minutes.

##### Why do we have it?

There are cases where we disable the rate limit to test multiple incorrect login
attempts.

#### Admin Auto Open

##### Usage

```ts
  bootstrap({ strapi }) {
    strapi.service('api::config.config').adminAutoOpenEnable(false);
  },
```

##### What does it do?

This endpoint can be used to enable or disable admin auto open.

##### Why do we have it?

It can be frustrating to work with the e2e tests locally. If auto open is set to
true a browser window will open each time you run the e2e tests as the strapi
app starts for the first time. Because of this we disable it during the
bootstrap phase of the test app instance.
