export const config = {
  default: {
    enabled: true,
    provider: 'local',
    sizeLimit: 1000000000, // 1GB
    actionOptions: {},
    sharp: {
      cache: false,
      concurrency: 1,
    },
    concurrentUploadSize: 1,
    concurrentUploadRequests: 1,
  },
  validator(config: {
    concurrentUploadSize?: unknown;
    concurrentUploadRequests?: unknown;
    sharp?: { limitInputPixels?: unknown } | null;
  }) {
    const assertPositiveInteger = (key: string, value: unknown) => {
      if (value === undefined) {
        return;
      }
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new Error(
          `upload plugin config: "${key}" must be an integer greater than or equal to 1`
        );
      }
    };

    // Server-side ceiling: files processed in parallel within one request.
    assertPositiveInteger('concurrentUploadSize', config.concurrentUploadSize);
    // Client-side parallelism: upload requests the admin fires at once.
    assertPositiveInteger('concurrentUploadRequests', config.concurrentUploadRequests);

    // Sharp throws on anything else at every image call, which the upload flow
    // reads as "not an image" and skips processing silently.
    const limitInputPixels = config.sharp?.limitInputPixels;
    if (
      limitInputPixels != null &&
      typeof limitInputPixels !== 'boolean' &&
      !(Number.isInteger(limitInputPixels) && (limitInputPixels as number) >= 0)
    ) {
      throw new Error(
        'upload plugin config: "sharp.limitInputPixels" must be a boolean or an integer greater than or equal to 0 (use env.int() to read it from the environment)'
      );
    }
  },
};
