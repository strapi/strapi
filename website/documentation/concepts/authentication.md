# Authentication

The Strapi OAuth hook allows you to easily connect your application to 150+ providers.

## Overview

OAuth is used by the web service providers to provide access to user resources in a secure manner. Each developer using this service must create an OAuth application and, after, requires the user to grant access to it.

As a part of the OAuth flow, the user is redirected to the web service's server, to log in (this step can be omitted if the user has already logged in).

Once the user agrees to use the application, he's redirected back to your website with the generated access token. We need to store that token and send it along, with each request made, to the service on behalf of the user.

Strapi enables you to add support for multiple providers through a simple and straightforward configuration data structure. This allows you to easily implement login forms with support for multiple options so your users can log in using different service providers.

The minimum required information to configure OAuth properly is:

- `consumer_key` and `consumer_secret` or `client_id` and `client_secret`.
- `redirect` or `callback` URL pointing back to your website.

Strapi requires that the redirect/callback URL specified in your OAuth application should have this format:

```bash
[protocol]://[host]/connect/[provider]/callback
```

## Typical flow

1. Register OAuth application on your provider's web site.

2. For `redirect` URL of your OAuth application **always** use this format:
  `[protocol]://[host]/connect/[provider]/callback`

3. Create a `authentication.json` in each environment (since you'll use different credentials) file containing:

```js
{
  "authentication": {
    "facebook": {
      "key": "[CLIENT_ID]",
      "secret": "[CLIENT_SECRET]",
      "callback": "/handle_facebook_response"
    },
    "twitter": {
      "key": "[CONSUMER_KEY]",
      "secret": "[CONSUMER_SECRET]",
      "callback": "/handle_twitter_response"
    }
  }
}
```

4. Navigate to `/connect/facebook` to initiate the OAuth flow for Facebook, or navigate to `/connect/twitter` to initiate the OAuth flow for Twitter.

5. Once the OAuth flow is completed you will receive the response data in the `/handle_facebook_response` route for Facebook, and in the `/handle_twitter_response` route for Twitter.

## Configuration

Configuration:

- Key: `authentication`
- Environment: `development`
- Location: `./config/environments/development/authentication.json`
- Type: `object`

Example:

```js
{
  "authentication": {
    "facebook": {
      "key": "[APP_ID]",
      "secret": "[APP_SECRET]",
      "callback": "/handle_facebook_callback"
    },
    "twitter": {
      "key": "[CONSUMER_KEY]",
      "secret": "[CONSUMER_SECRET]",
      "callback": "/handle_twitter_callback"
    }
  }
}
```

Options (for each provider):

- `key` (string): `consumer_key` or `client_id` of your application.
- `secret` (string): `consumer_secret` or `client_secret` of your application.
- `scope` (array): Array of OAuth scopes to request
- `callback` (string): Specific callback to use for this provider.
- `custom_params` (object): Some providers may employ custom authorization parameters outside of the ones specified in the configuration section. You can pass those custom parameters using the `custom_params` option:

```js
{
  "authentication": {
    "google": {
      "custom_params": {
        "access_type": "offline"
      }
    },
    "reddit": {
      "custom_params": {
        "duration": "permanent"
      }
    },
    "trello": {
      "custom_params": {
        "name": "my app",
        "expiration": "never"
      }
    }
  }
}
```

## Usage

Each key is a provider that you'll want to configure and use in your application. You want to configure and use both Twitter and Facebook. The `key` and the `secret` keys are required and they must contain the credentials for your OAuth application.

The `callback` key is the route on your server where you want to receive the access tokens after the OAuth flow is completed.

First, you need to register your `callback` route for each provider. Keeping the previous example, it should look like this:

```js
{
  "routes": {
    "GET /handle_facebook_callback": {
      "controller": "User",
      "action": "registerFacebook",
      "policies": []
    },
    "GET /handle_twitter_callback": {
      "controller": "User",
      "action": "registerTwitter",
      "policies": []
    }
  }
}
```

Then, you need to create an action for the route. Here is a simple example:

```js
// Action to handle Facebook registration in the `User` controller.
registerFacebook: function * () {
  this.body = JSON.stringify(this.query, null, 2)
},

// Action to handle Twitter registration in the `User` controller.
registerTwitter: function * () {
  this.body = JSON.stringify(this.query, null, 2)
}
```

## Specific configuration options

There are a few more configuration options that you might want to use.

### scope

Some service providers allow us to configure the permissions that our application will request from the user. These permissions are set inside the `scope` key of the configuration:

```js
{
  "authentication": {
    "facebook": {
      "key": "[APP_ID]",
      "secret": "[APP_SECRET]",
      "callback": "/handle_facebook_callback",
      "scope": [
        "user_groups",
        "user_likes"
      ]
    }
  }
}
```

In this case, the user will be asked to grant access to its groups and likes on Facebook.

### state

Some providers require us to send a CORS token to ensure that the flow was initiated from our own server. The `state` key in the configuration can be used for that purpose:

```js
{
  "authentication": {
    "facebook": {
      "key": "[APP_ID]",
      "secret": "[APP_SECRET]",
      "callback": "/handle_facebook_callback",
      "scope": [
        "user_groups",
        "user_likes"
      ],
      "state": "very secret"
    }
  }
}
```

## Sandbox Redirect URI

Very rarely you may need to override the default `redirect_uri` that Strapi generates for you.

For example Feedly supports only `http://localhost` as redirect URL of their Sandbox OAuth application, and it won't allow the `http://localhost/connect/feedly/callback` path:

```js
{
  "authentication": {
    "feedly": {
      "redirect_uri": "http://localhost"
    }
  }
}
```

In case you override the `redirect_uri` in your config, you'll have to redirect the user to the `[protocol]://[host]/connect/[provider]/callback` route that Strapi uses to execute the last step of the OAuth flow using sessions and `this.redirect`.

After that you will receive the results from the OAuth flow inside the route specified in the `callback` key of your configuration.

## Quirks

### Subdomain

Some providers require you to set your company name as a *subdomain* in the OAuth URLs. For example for Freshbooks, Shopify, Vend and Zendesk you can set that value through the `subdomain` option:

```js
{
  "authentication": {
    "shopify": {
      "subdomain": "mycompany"
    }
  }
}
```

Then Strapi will generate the correct OAuth URLs:

```js
{
  "authentication": {
    "shopify": {
      "authorize_url": "https://mycompany.myshopify.com/admin/oauth/authorize",
      "access_url": "https://mycompany.myshopify.com/admin/oauth/access_token"
    }
  }
}
```

Alternatively you can override the entire `request_url`, `authorize_url` and `access_url` in your configuration.

### Sandbox URLs

Some providers may have _sandbox_ URLs for testing. To use them just override the entire `request_url`, `authorize_url` and `access_url` in your configuration:

```js
{
  "authentication": {
    "paypal": {
      "authorize_url": "https://www.sandbox.paypal.com/webapps/auth/protocol/openidconnect/v1/authorize",
      "access_url": "https://api.sandbox.paypal.com/v1/identity/openidconnect/tokenservice"
    },
    "evernote": {
      "request_url": "https://sandbox.evernote.com/oauth",
      "authorize_url": "https://sandbox.evernote.com/OAuth.action",
      "access_url": "https://sandbox.evernote.com/oauth"
    }
  }
}
```

### Flickr, Optimizely

Flickr uses a custom authorization parameter to pass its scopes called `perms`, and Optimizely uses `scopes`. However you should use the regular `scope` option in your configuration:

```js
{
  "authentication": {
    "flickr": {
      "scope": ["write"]
    }
    "optimizely": {
      "scope": ["all"]
    }
  }
}
```

### SurveyMonkey

For SurveyMonkey set your Mashery user name as `key` and your application key as `api_key`:

```js
{
  "authentication": {
    "surveymonkey": {
      "key": "[MASHERY_USER_NAME]",
      "secret": "[CLIENT_SECRET]",
      "api_key": "[CLIENT_ID]"
    }
  }
}
```

### Fitbit, LinkedIn, ProjectPlace

Initially these providers supported only OAuth1, so the `fitbit` and `linkedin` names are used for that. To use their OAuth2 flow append `2` at the end of their names:

```js
{
  "authentication": {
    "fitbit2": {},
    "linkedin2": {},
    "projectplace2": {}
  }
}
```

## Response Data

The OAuth response data is returned as a querystring in your **final** callback - the one you specify in the `callback` key of your Strapi configuration.

### OAuth1

For OAuth1 the `access_token` and the `access_secret` are accessible directly, `raw` contains the raw response data:

```js
{
  access_token: '...',
  access_secret: '...',
  raw: {
    oauth_token: '...',
    oauth_token_secret: '...',
    some: 'other data'
  }
}
```

### OAuth2

For OAuth2 the `access_token` and the `refresh_token` (if present) are accessible directly, `raw` contains the raw response data:

```js
{
  access_token: '...',
  refresh_token: '...',
  raw: {
    access_token: '...',
    refresh_token: '...',
    some: 'other data'
  }
}
```

### Error

In case of an error, the `error` key will be populated with the raw error data:

```js
{
  error: {
    some: 'error data'
  }
}
```

## Bypass unauthorized localhost

You should keep in mind that not all web service providers allow localhosts as a value for the OAuth application redirect URL. The easiest way to get around this is to add a new entry to your host's file like this:

```bash
127.0.0.1      mywebsite.com
```

If you need to use a different URL than your `localhost` you also need to override your `server` config for the `authentication` key like this:

```js
{
  "authentication": {
    "server": {
      "protocol": "http",
      "host": "mywebsite.com:3000"
    },
    "facebook": {
      "key": "[APP_ID]",
      "secret": "[APP_SECRET]",
      "callback": "/handle_facebook_callback",
      "scope": [
        "user_groups",
        "user_likes"
      ]
    },
    "twitter": {
      "key": "[CONSUMER_KEY]",
      "secret": "[CONSUMER_SECRET]",
      "callback": "/handle_twitter_callback"
    }
  }
}
```

The `server` key is required and it contains the `host` name of your server and the `protocol` you're running your site on.

## Providers

## Supported providers

- [`23andme`](https://api.23andme.com)
- [`500px`](http://developers.500px.com)
- [`acton`](https://developer.act-on.com)
- [`acuityscheduling`](https://developers.acuityscheduling.com)
- [`aha`](http://www.aha.io/api)
- [`amazon`](http://login.amazon.com/documentation)
- [`angellist`](https://angel.co/api)
- [`appnet`](https://developers.app.net)
- [`asana`](https://asana.com/developers)
- [`assembla`](http://api-doc.assembla.com)
- [`axosoft`](http://developer.axosoft.com)
- [`basecamp`](https://github.com/basecamp/bcx-api)
- [`beatport`](https://oauth-api.beatport.com)
- [`beatsmusic`](https://developer.beatsmusic.com)
- [`bitbucket`](https://confluence.atlassian.com/display/BITBUCKET)
- [`bitly`](http://dev.bitly.com)
- [`box`](https://developers.box.com)
- [`buffer`](https://dev.buffer.com)
- [`campaignmonitor`](https://www.campaignmonitor.com/api)
- [`cheddar`](https://cheddarapp.com/developer)
- [`clio`](http://api-docs.clio.com)
- [`codeplex`](https://www.codeplex.com/site/developers)
- [`coinbase`](https://developers.coinbase.com)
- [`concur`](https://developer.concur.com)
- [`constantcontact`](https://developer.constantcontact.com)
- [`copy`](https://developers.copy.com)
- [`coursera`](https://tech.coursera.org)
- [`dailymile`](http://www.dailymile.com/api/documentation)
- [`dailymotion`](https://developer.dailymotion.com)
- [`deezer`](http://developers.deezer.com)
- [`delivery`](https://developers.delivery.com)
- [`deputy`](http://api-doc.deputy.com)
- [`deviantart`](https://www.deviantart.com/developers/)
- [`digitalocean`](https://developers.digitalocean.com)
- [`discogs`](http://www.discogs.com/developers)
- [`disqus`](https://disqus.com/api/docs)
- [`dribbble`](http://developer.dribbble.com)
- [`dropbox`](https://www.dropbox.com/developers)
- [`echosign`](https://secure.echosign.com/public/docs/restapi/v3)
- [`ecwid`](http://developers.ecwid.com)
- [`edmodo`](https://developers.edmodo.com)
- [`egnyte`](https://developers.egnyte.com)
- [`elance`](https://www.elance.com/q/api2)
- [`etsy`](https://www.etsy.com/developers)
- [`eventbrite`](http://developer.eventbrite.com)
- [`evernote`](https://dev.evernote.com)
- [`everyplay`](https://developers.everyplay.com)
- [`eyeem`](https://www.eyeem.com/developers)
- [`facebook`](https://developers.facebook.com)
- [`familysearch`](https://familysearch.org/developers)
- [`feedly`](https://developer.feedly.com)
- [`fitbit`](http://dev.fitbit.com)
- [`flattr`](http://developers.flattr.net)
- [`flickr`](https://www.flickr.com/services)
- [`flowdock`](https://www.flowdock.com/api)
- [`fluidsurveys`](http://docs.fluidsurveys.com)
- [`formstack`](http://developers.formstack.com)
- [`foursquare`](https://developer.foursquare.com)
- [`freeagent`](https://dev.freeagent.com)
- [`freshbooks`](https://www.freshbooks.com/developers)
- [`geeklist`](http://hackers.geekli.st)
- [`getbase`](https://developers.getbase.com)
- [`getpocket`](http://getpocket.com/developer)
- [`gitbook`](https://developer.gitbook.com)
- [`github`](https://developer.github.com)
- [`gitlab`](http://doc.gitlab.com/ce/api)
- [`gitter`](https://developer.gitter.im)
- [`goodreads`](https://www.goodreads.com/api)
- [`google`](https://developers.google.com)
- [`groove`](https://www.groovehq.com/docs)
- [`gumroad`](https://gumroad.com/api)
- [`harvest`](https://github.com/harvesthq/api)
- [`hellosign`](https://www.hellosign.com/api)
- [`heroku`](https://devcenter.heroku.com/categories/platform-api)
- [`imgur`](https://api.imgur.com)
- [`infusionsoft`](https://developer.infusionsoft.com)
- [`instagram`](https://instagram.com/developer)
- [`intuit`](https://developer.intuit.com)
- [`jawbone`](https://jawbone.com/up/developer)
- [`jumplead`](https://developer.jumplead.com)
- [`kakao`](https://developers.kakao.com)
- [`letsfreckle`](http://developer.letsfreckle.com)
- [`linkedin`](https://developer.linkedin.com)
- [`live`](https://msdn.microsoft.com/en-us/library/dn783283.aspx)
- [`mailchimp`](https://apidocs.mailchimp.com)
- [`mailup`](http://help.mailup.com/display/mailupapi/REST+API)
- [`mapmyfitness`](https://developer.underarmour.com)
- [`meetup`](http://www.meetup.com/meetup_api)
- [`mixcloud`](https://www.mixcloud.com/developers)
- [`moves`](https://dev.moves-app.com)
- [`moxtra`](https://developer.moxtra.com)
- [`myob`](http://developer.myob.com)
- [`odesk`](https://developers.odesk.com)
- [`openstreetmap`](http://wiki.openstreetmap.org/wiki/API_v0.6)
- [`optimizely`](http://developers.optimizely.com)
- [`paypal`](https://developer.paypal.com)
- [`plurk`](http://www.plurk.com/API)
- [`podio`](https://developers.podio.com)
- [`producteev`](https://www.producteev.com/api/doc)
- [`producthunt`](https://api.producthunt.com/v1/docs)
- [`projectplace`](https://service.projectplace.com/apidocs)
- [`pushbullet`](https://docs.pushbullet.com)
- [`ravelry`](http://www.ravelry.com/api)
- [`rdio`](http://www.rdio.com/developers)
- [`redbooth`](https://redbooth.com/api)
- [`reddit`](http://www.reddit.com/dev/api)
- [`runkeeper`](http://developer.runkeeper.com)
- [`salesforce`](https://developer.salesforce.com)
- [`shoeboxed`](https://github.com/Shoeboxed/api)
- [`shopify`](https://docs.shopify.com/api)
- [`skyrock`](http://www.skyrock.com/developer)
- [`slack`](https://api.slack.com)
- [`slice`](https://developer.slice.com)
- [`smartsheet`](http://smartsheet-platform.github.io/api-docs)
- [`socialpilot`](http://developer.socialpilot.co)
- [`socrata`](http://dev.socrata.com)
- [`soundcloud`](https://developers.soundcloud.com)
- [`spotify`](https://developer.spotify.com)
- [`square`](https://connect.squareup.com)
- [`stackexchange`](https://api.stackexchange.com)
- [`stocktwits`](http://stocktwits.com/developers)
- [`stormz`](http://developer.stormz.me)
- [`strava`](http://strava.github.io/api)
- [`stripe`](https://stripe.com/docs)
- [`surveygizmo`](http://apihelp.surveygizmo.com)
- [`surveymonkey`](https://developer.surveymonkey.com)
- [`thingiverse`](http://www.thingiverse.com/developers)
- [`ticketbud`](https://api.ticketbud.com)
- [`todoist`](https://developer.todoist.com)
- [`trakt`](http://docs.trakt.apiary.io)
- [`traxo`](https://developer.traxo.com)
- [`trello`](https://developers.trello.com)
- [`tripit`](https://www.tripit.com/developer)
- [`tumblr`](https://www.tumblr.com/docs/en/api/v2)
- [`twitch`](http://dev.twitch.tv)
- [`twitter`](https://dev.twitter.com)
- [`uber`](https://developer.uber.com)
- [`underarmour`](https://developer.underarmour.com)
- [`upwork`](https://developers.upwork.com)
- [`uservoice`](https://developer.uservoice.com)
- [`vend`](https://developers.vendhq.com)
- [`verticalresponse`](http://developers.verticalresponse.com)
- [`vimeo`](https://developer.vimeo.com)
- [`visualstudio`](https://www.visualstudio.com/integrate)
- [`vk`](http://vk.com/dev)
- [`weekdone`](https://weekdone.com/developer)
- [`weibo`](http://open.weibo.com)
- [`withings`](http://oauth.withings.com/api)
- [`wordpress`](https://developer.wordpress.com)
- [`wrike`](https://developers.wrike.com)
- [`xero`](http://developer.xero.com)
- [`xing`](https://dev.xing.com)
- [`yahoo`](https://developer.yahoo.com)
- [`yammer`](https://developer.yammer.com)
- [`yandex`](https://tech.yandex.com)
- [`zendesk`](https://developer.zendesk.com)

### Custom providers

In case you have a private OAuth provider that is not part of the officially supported ones, you can define it in your configuration by adding a custom key for it.

In this case you have to specify all of the required provider keys by yourself:

```js
{
  "authentication": {
    "mywebsite": {
      "authorize_url": "https://mywebsite.com/authorize",
      "access_url": "https://mywebsite.com/token",
      "oauth": 2,
      "key": "[CLIENT_ID]",
      "secret": "[CLIENT_SECRET]",
      "scope": [
        "read",
        "write"
      ]
    }
  }
}
```
