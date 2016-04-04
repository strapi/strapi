# Services

Services can be thought of as libraries which contain functions that you might want to use in many places of your application. For example, you might have an `sendEmail` service which wraps some default email message boilerplate code that you would want to use in many parts of your application.

For example you can generate a service named `sendEmail` for the `email` API using the CLI:

```bash
$ strapi generate:service sendEmail email
```
