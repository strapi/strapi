# Collected Usage Information

## Committment to our users & data collection

We are committed to providing a solution, with Strapi, that exceeds the expectations of the users and community. We are also committed to continuing to develop and make Strapi even better than it is today. To that end, Strapi contains a feature in which anonymous and otherwise non-sensitive data is collected. This data is collectively aggregated for all our users, which when taken together give us a better global understanding of how users are interacting and using Strapi.

### Why?

The number of developers using Strapi is growing signficantly. As mentioned earlier, we are committed to providing the best experience to our users. We will always continue to do hands-on UI/UX testing, surveys, issue tracking, roadmap votes, etc... and otherwise talk with the Strapi Community while striving to understand and deliver what is being asked for and what is needed, by any means available.

However, these above actions alone are often insufficient to maintain an overall picture of some aspects of the global usage of Strapi and its features. Globally aggregated data helps us answer and make choices around questions like these:

- Are our users using a particular feature or not? For those who are using it, what do they use it for? Is it activated and used along side another plugin? Which specific plugin? Or something else, like, only in development/production?
- How long does setting up a project take? If the global install time increases, does it means that users are encountering issues or the process is simply too complicated?
- What type of errors our users are facing?
- What are the most used plugins?
- Should we focus our efforts to being compatible with Node 12? Maybe our community uses version 12, in greater percentages than the global Node.js community?
- And more...

Without these metrics, we wouldn't be able to make the right choices as we continue to move forward with the roadmap and provide what you, the community and users, are asking for.

### What data is collected?

- Unique project ID (generated with UUID)
- Unique machine ID (generated with [node-machine-id](https://www.npmjs.com/package/node-machine-id))
- Environment state (development, staging, production)
- System information (OS)
- Build configurations

::: warning GDPR
The collected data are of a non-sensitive nature and no personal data is collected. We are compliant with the European GDPR recommendations (see our [Privacy Policy](https://strapi.io/privacy)). We do not collect databases configurations, password or custom variables. Any data collected (as above) is secured, encrypted and anonymized.
:::

### How to opt-out?

You can easily disable the default data collection feature.

Should you decide to opt-out, you may do so by removing the `uuid` property in the `package.json` file located within the root of your project. This will automatically disable this feature.

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

### Questions?

Should you have any questions regarding this feature, feel free to email [privacy@strapi.io](mailto:privacy@strapi.io), and we will answer as soon as possible.
