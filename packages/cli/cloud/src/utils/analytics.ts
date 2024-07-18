import type { CLIContext, CloudApiService, TrackPayload } from '../types';

const trackEvent = async (
  cloudApiService: CloudApiService,
  eventName: string,
  eventData: TrackPayload,
  ctx: CLIContext
) => {
  try {
    await cloudApiService.track(eventName, eventData);
  } catch (e) {
    ctx.logger.debug(`Failed to track ${eventName}`, e);
  }
};

export { trackEvent };
