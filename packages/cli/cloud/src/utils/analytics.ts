import type { CLIContext, CloudApiService, TrackPayload } from '../types';

const trackEvent = async (
  ctx: CLIContext,
  cloudApiService: CloudApiService,
  eventName: string,
  eventData: TrackPayload
) => {
  try {
    await cloudApiService.track(eventName, eventData);
  } catch (e) {
    ctx.logger.debug(`Failed to track ${eventName}`, e);
  }
};

export { trackEvent };
