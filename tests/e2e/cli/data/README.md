# Test Data Sets

The CLI e2e tests currently only support one app-template, therefore any modifications to the schema of the template must be reflected in all datasets.

The following test data set is available for CLI e2e testing. It includes all Strapi data, such as transfer tokens, api tokens, admin and u&p users and are imported with a custom data-transfer script.

Note on exporting data: To reduce the filesize of what is committed to the repo, an additional step of compressing the media files (outside of Strapi) was done, but this does not effect anything within Strapi.

## complex.tar

Following is a list of some useful information from this dataset.

### The following user accounts are available with the password `Testpassword1!`

Admin user: test.admin@strapi.io

U&P users:

- confirmed: test.up.user@strapi.io
- unconfirmed: test.up.user.uncomfirmed@strapi.io
- blocked: test.up.user.confirmed.blocked@strapi.io
- unpublished: test.up.user.confirmed.unpublished@strapi.io

To see the actual data, please export the tar file or load a test-app with the develop command after importing.

A brief overview of the data:

- `complex` content type that contains a published, unpublished, and complete entity, including nested repeatable components, a dynamic zone, and all relation types.
- `category` content type that contains published and unpublished entities, and is used primarily as a relation target
- `user` the U&P users
- several local image media files, including in nested folders
