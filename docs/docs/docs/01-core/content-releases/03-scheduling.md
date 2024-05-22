---
title: Content Releases Scheduling
description: Content Releases Scheduling
tags:
  - content-releases
  - tech design
---

:::caution
Content Releases Scheduling is not yet a stable feature. Therefore, all the elements documented on this page are not currently visible. If you wish to try Releases Scheduling, you can enable it **at your own** risk using the `contentReleasesScheduling` feature flag.
:::

Scheduling provides users with the ability to set a scheduled date for the release, automating its publication or unpublishing. When this happens, a webhook is triggered, providing the result of the attempt to publish the release.

## How it works

Everytime you create or update a release and add a scheduled date, the server responsible for handling this request will generate a new cronjob (utilizing node-schedule) for the selected date to publish the release.

## Timezones

When selecting a scheduled date, you have the option to choose a specific timezone; by default, your system timezone is selected. This measure is taken to prevent any potential confusion when selecting the publication time for a release. Consequently, if a user sets a schedule for 16:00 using the "Europe/Paris" timezone (UTC+01:00), another user accessing the same release will see the same time (16:00 (UTC+01:00)), regardless of their system's timezone.

## Scheduling in a architecture with multiple Strapi instances

It's possible that your Strapi project runs on multiple instances. In such cases, what happens with the cronjobs? Do they all run simultaneously, attempting to publish the release multiple times? To understand how we address this scenario, it's important to differentiate between two cases when scheduling a release:

### Release scheduled on runtime

If you have 3 Strapi instances running concurrently, and you distribute traffic among them using any method, there is not a big problem. This is because the server responsible for handling one request to create/update a release and add a schedule will be the only server with the associated cronjob. Then, there's no duplication, and potential race condition problems are avoided.

### Starting a strapi instance

The problem is starting a new Strapi instance, because we retrieve all scheduled releases and ensure that cronjobs are created for each one. Consequently, multiple Strapi instances might end up with the same cronjob for a release publish. To address this, we implement the following logic:

<img
  src="/img/content-manager/content-releases/scheduling-publish.png"
  alt="a diagram overview explaining the publish release flow"
/>

We set up a transaction that locks the release being published using SQL forUpdate. This means that any other processes attempting to access the release row will be put on hold until the first one finishes executing.

If the validation of the release entries is successful, the publish action proceeds smoothly. In this scenario, we update the releasedAt column of the release with the current date and release the row lock. Subsequently, any incoming processes attempting to access the release would simply encounter an error because the release has already been published.

On the other hand, if the publish process fails, we update the release's status to "failed". When the status is marked as failed, any subsequent attempts to publish will fail silently. The "failed" status only changes when a user makes alterations to the release.
