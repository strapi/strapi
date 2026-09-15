# RTK Query

`uploadApi` (`services/api.ts`) is the shared base. It enhances the
shared `adminApi` with `tagTypes: ['Asset', 'Folder']`. Every endpoint
file under `services/` injects into it.

## Adding an endpoint

```ts
const assetsApi = uploadApi.injectEndpoints({
  endpoints: (builder) => ({
    updateAsset: builder.mutation<UpdateAsset.Response, UpdateAssetArgs>({
      query: ({ id, data }) => ({
        url: `/upload?id=${id}`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Asset', id },
        { type: 'Asset', id: 'LIST' },
      ],
    }),
  }),
});

export const { useUpdateAssetMutation } = assetsApi;
```

Don't create a parallel `createApi(...)` — caches won't merge.

## Tag conventions

| Pattern                          | When                                                |
| -------------------------------- | --------------------------------------------------- |
| `{ type: 'Asset', id }`          | Single-asset reads / writes                         |
| `{ type: 'Asset', id: 'LIST' }`  | Anything that affects a list (create, delete, move) |
| `{ type: 'Folder', id }`         | Single folder                                       |
| `{ type: 'Folder', id: 'LIST' }` | Anything that affects the folder tree               |

Mutations that change folder counts (delete asset, move asset) must
invalidate `Folder` LIST too, so the sidebar counts refresh.

## providesTags shape for lists

```ts
providesTags: (result) =>
  result
    ? [
        ...result.map(({ id }) => ({ type: 'Asset' as const, id })),
        { type: 'Asset', id: 'LIST' },
      ]
    : [{ type: 'Asset', id: 'LIST' }],
```

The `as const` on the type literal is required, otherwise RTK Query
narrows the array to `{ type: string; id: number }[]` and tag matching
breaks.

## File uploads

Build the `FormData` inside `queryFn`, not in the consumer. The browser
`File` type clashes with the contract `File` from
`@strapi/types/contracts/upload` — see [gotchas.md](gotchas.md) for the
`globalThis.File` workaround.
