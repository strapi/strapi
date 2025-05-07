import { licenseRegistryApi } from './api';

const usersService = licenseRegistryApi
  .enhanceEndpoints({
    addTagTypes: ['TrialCountdown'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getTrialCountdown: builder.query<EnhancedGetTrialCountdownResponse, GetRolePermissionsParams>(
        {
          query: ({ id, ...params }) => ({
            url: `/licenses/${id}/trial-countdown`,
            method: 'GET',
            config: {
              params,
            },
          }),
          transformResponse: (res: GetTrialCountdownResponse) => {
            const targetDate = new Date(res.trialEndsAt);
            const now = new Date();

            const millisecondsPerDay = 1000 * 60 * 60 * 24;
            const timeDifference = targetDate.getTime() - now.getTime();

            const daysLeft = Math.ceil(timeDifference / millisecondsPerDay);

            return {
              ...res,
              daysLeft,
            };
          },
        }
      ),
    }),
    overrideExisting: false,
  });

interface GetRolePermissionsParams {
  id: string;
}

interface GetTrialCountdownResponse {
  trialEndsAt: string;
}

interface EnhancedGetTrialCountdownResponse extends GetTrialCountdownResponse {
  daysLeft: number;
}

const { useGetTrialCountdownQuery } = usersService;

export { useGetTrialCountdownQuery };
