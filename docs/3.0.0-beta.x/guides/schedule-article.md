# Schedule article

This guide will explain how to create an article schedule system.

## Introduction

This guide will use this [draft system](.draft.md) guide. So first read it to understand the draft/published status and the Article API that we will use in this guide.

What we want here is to be able to set a publication date for an article, and at this date, switch the draft status to published.

## Example

For this example, we will have to add a `published_at` attribute to the Article Content Type.

- Click on the Content Type Builder link in the left menu
- Select the Article Content Type
- Add another field
  - `date` attribute named `published_at` with `datetime` type

And add some data with different dates and status to be able to see a plublication happen.
Some entries need to have `draft` status and a `published_at` date lower that your current date.

The goal will be to verify every minute if there is `draft` articles that have a `published_at` lower that the current date.

## Create a CRON task

To execute a function every minutes, we will use CRON tasks.

Here is the [full documentation](../concepts/configurations.md#cron-tasks) of this feature.

**Path —** `./config/functions/cron.js`

```js
module.exports = {
  '*/1 * * * *': () => {
    console.log('1 minute later');
  },
};
```

Make sure the enabled cron config is set to true in ./config/environments/**/server.json file.

## Business login

Now we can start to write the code that will fetch all draft Articles that have a `published_at` lower than the current date.

Then we will update the `status` of all these articles to `published`.

**Path —** `./config/functions/cron.js`

```js
module.exports = {
  '*/1 * * * *': async () => {
    // fetch articles to publish
    const draftArticleToPublish = await strapi.api.article.services.article.find({
      status: 'draft',
      published_at_lt: new Date()
    });

    // update status of articles
    draftArticleToPublish.forEach(async (article) => {
      await strapi.api.article.services.article.update(
        {id: article.id},
        {status: 'published'}
      );
    });
  },
};
```

And tada!


