# Reporting security issues

!!! warning
    All security bugs in Strapi are taken seriously and should be reported by emailing [support@strapi.io](mailto:support@strapi.io)
    **Please don't file a public issue.**

This means including features to protect application makers from common issues like CRSF, Script Injection, SQL Injection, and the like. But it also means a clear policy on how to report vulnerabilities and receive updates when patches to those are released.

## The process

When you report a vulnerability, one of the project members will respond to you within a maximum of 7 days. This response will most likely be an acknowledgement that we've received the report and will be investigating it immediately. Our target patching timeframe for serious security vulnerabilities is 7 days - however, we cannot guarantee that this is possible in all cases (more on that below).

Based upon the nature of the vulnerability, and the amount of time it would take to fix, we'll either send out a patch that disables the broken feature, provide an estimate of the time it will take to fix, and/or document best practices to follow to avoid production issues. This process can take some time, especially when coordination is required with maintainers of other projects. Every effort will be made to handle the bug in as timely a manner as possible.

When a solution is achieved we notify you and a release a patch with an explanation of it's origin and crediting you (if you have chosen to be identified).

## Is this an SLA?

No this is not. Like any open-source project, we're run by volunteers, and we can't legally guarantee any kind of Service Level Agreement (see [the licenses](./licenses/index.html) for details). However, the team cares deeply about Strapi, and all of us have at least a few different websites and APIs running on Strapi in production. We will always publish a fix for any serious security vulnerability as soon as possible-- not just out of the kindness of our hearts, but because it could affect our applications (and our customer's applications) too.
