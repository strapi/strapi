# Traceability

In order to improve the product, Strapi contains a traceability feature which collects anynomous and non-sensitive data (by default). After aggregating these data, it gives us more insights to really understand how the users are using Strapi.

## How to opt-out?

You can disable the traceability feature by removing the `uuid` property in the `package.json` file at the root of your project.

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "strapi": {
    "uuid": "7b581c0d-89b7-479e-b379-a76ab90b8754"
  },
  "license": "MIT"
}
```

## Why?

As you might know, the number of developers using Strapi is growing significantly. We are a product driven company which means that we want to offer the best experience to our users. Even, if we are doing video calls and interviews, we need to aggregate a significant amount of data to help us to make choices on the product as:

- Are our users using this feature or not? For those who are using it what do they have in common? A specific plugin? Or something else?
- How long it takes to set up a project? If the time increases, does it means that they are encountering issues or the process is simply too complicated?
- What type of errors our users are facing?
- What are the most used plugins?
- Should we focus our effort on being compatible with Node 12? Even if it is not the most used versions based on Node.js metrics, is it the same for our community?

And many more... without these metrics, we won't be able to do the right choice to give you the best experience as possible.


## What are the collected data?

- Unique project ID (generated with UUID)
- Unique machine ID (generated with [node-machine-id](https://www.npmjs.com/package/node-machine-id))
- Environment state (development, staging, production)
- OS informations (system)
- Build configurations

::: warning GDPR
The collected data are non-sensitive or personal data. We are compliant with the European recommendations (see our [Privacy Policy](https://strapi.io/privacy)). We do not collect databases configurations, password or custom variables. The data are secured, encrypted and anonymized.
:::

