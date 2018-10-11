# strapi-upload-google-storage

Provider for strapi-plugin-upload

## Setup

1.  Follow the instructions at https://cloud.google.com/docs/authentication/getting-started to create a service account key with at least the `Storage Admin` role.
2.  Download the resulting JSON file containing your key.
3.  Copy the entire file contents into the `Service Account JSON` field under "Upload - Settings" in the Strapi admin.
4.  Enter a storage bucket to use or create.

The provider will parse the JSON for the required credentials.

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
