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
  validator(config: { concurrentUploadSize?: unknown; concurrentUploadRequests?: unknown }) {
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
  },
};
