# Usage tracking

In order to improve the product and understand how the community is using it, we are collecting non-sensitive data.

## Collected data
Here is the list of the collected data and why we need them.

- **UUID**
  *Identify the app with a unique identifier.*
- **Model names and attributes names**
  *Understand what kind of APIs are built with Strapi (content or product or service?)*
- **Environment state (development, staging, production)**
  *Understand how the developers are using the different configurations? How many projects are started in production mode?*
- **Node modules names**
  *Are developers integrating Strapi with Stripe? It means that we should develop a plugin to simplify the development process with Stripe.
  Are developers using Strapi with strapi-bookshelf or strapi-mongoose? It helps us prioritize the issues.*
- **OS**
  *Is the community using Windows, Linux or Mac? It helps us prioritize the issues.*
- **Build configurations**
  *How many people are deploying the admin on another server?*

We are not collecting sensitive data such as databases configurations, environment or custom variables. The data are encrypted and anonymised.

> GDPR: The collected data are non-sensitive or personal data. We are compliant with the European recommendations (see our [Privacy Policy](https://strapi.io/privacy)).

## Disable

You can disable the tracking by removing the `uuid` property in the `package.json` file at the root of your project.
