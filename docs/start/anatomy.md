---
title: Anatomy
---

Now that you have the generated directory let's see what we have.

## APIs

The `./api` directory contains the vast majority of your app's back-end logic. It is home to the "M" and "C" in [MVC Framework](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller).

Every API is composed of:

- Routes of the API and config that can be different for each environment.
- Controllers contain most of the back-end logic for your API.
- Models are the structures that contain data for your API.
- Policies are typically used to authenticate clients and restrict access to certain parts of your API.
- Services are similar to controller actions. They contain logic that used by your API that doesn't necessarily rely on the requests and the responses.

## Configuration

The `./config`  directory is full of config that will allow you to customize and configure your application.

In `./config/locales` is where you can add translations as JSON key-value pairs. The name of the file should match the language that you are supporting, which allows for automatic language detection based on request headers.

The `./config/environments`  directory contains various environment settings such as API keys or remote database passwords. The environment directory used is determined by the environment Strapi is going to be running in.

The `./config/functions` directory contains lifecycle functions for your application such as CRON tasks and bootstrap jobs.

## Data info

The `./data` directory contains all the migration files for every connection and your database index if you're using SQLite.

## Public assets

The `./public` directory houses all of the static files that your application will need to host.

## Views

The `./views` directory holds all of your custom views for template engines like EJS, Handlebars, Jade, etc.

Note that views are disabled by default and the directory doesn't exist since the philosophy of Strapi is to be API first.
