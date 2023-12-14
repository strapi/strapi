import { Update } from '../../../shared/contracts/user';

import { adminApi } from './admin';

const usersService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation<
      Update.Response['data'],
      Omit<Update.Request['body'] & Update.Params, 'blocked'>
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/users/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'User', id }],
    }),
  }),
  overrideExisting: false,
});

const { useUpdateUserMutation } = usersService;

export { useUpdateUserMutation };
