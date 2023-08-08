---
title: NPS
tags:
  - admin
  - nps
---

## What does it do

The NPS survey is shown to users to get its feedback about Strapi. It is based on a rating scale from 0 to 10, and we also invite users to provide additional comments.

## When we show the survey?

Before check all the logic, please note that we only present the NPS survey to admin users who have selected the "Keep me updated" checkbox during registration. Additionally, please be aware that the survey is displayed only 5 minutes after a user opens the page.

We follow this logic to show the survey:

- If a user responds to the survey, the survey will be presented again within 90 days.
- If a user does not respond to the survey the first time after their last response, the survey will be presented again after 7 days.
- If a user does not respond to the survey for the second or subsequent time after their last response, the survey will be presented again after 90 days.

## Where data is submitted

The data is sent to this endpoint: `https://analytics.strapi.io/submit-nps`.

## Hooks

### useNpsSurveySettings

This hook uses the `usePersistentState` hook from the helper-plugin (more information available [here](/docs/core/helper-plugin/hooks/use-persistent-state)). It is exported so that it can be used during the registration process to determine whether users have selected the "Keep me updated" checkbox.
