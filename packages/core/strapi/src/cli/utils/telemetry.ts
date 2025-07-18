import { generateInstallId, env } from '@strapi/utils';

export const sendEvent = async (event: string, uuid: string, installId?: any) => {
  const analyticsUrl = env('STRAPI_ANALYTICS_URL', 'https://analytics.strapi.io');
  try {
    await fetch(`${analyticsUrl}/api/v2/track`, {
      method: 'POST',
      body: JSON.stringify({
        event,
        deviceId: generateInstallId(uuid, installId),
        groupProperties: { projectId: uuid },
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Strapi-Event': event,
      },
    });
  } catch (e) {
    // ...
  }
};
