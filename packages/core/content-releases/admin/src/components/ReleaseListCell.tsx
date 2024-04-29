// import * as React from 'react';

// import { Box, Flex, Popover, Typography } from '@strapi/design-system';
// import { Link } from '@strapi/design-system';
// import { Modules, UID } from '@strapi/types';
// import { useIntl } from 'react-intl';
// import styled from 'styled-components';

// import { useGetMappedEntriesInReleasesQuery } from '../services/release';
// import { useTypedSelector } from '../store/hooks';

// // TODO: Migrate to v5
// // import type { CMAdminConfiguration, ListLayoutRow } from '@strapi/admin/strapi-admin';

// type Entity = Modules.EntityService.Result<UID.Schema>;

// const Button = styled.button`
//   svg {
//     > g,
//     path {
//       fill: ${({ theme }) => theme.colors.neutral500};
//     }
//   }
//   &:hover {
//     svg {
//       > g,
//       path {
//         fill: ${({ theme }) => theme.colors.neutral600};
//       }
//     }
//   }
//   &:active {
//     svg {
//       > g,
//       path {
//         fill: ${({ theme }) => theme.colors.neutral400};
//       }
//     }
//   }
// `;

// const ActionWrapper = styled(Flex)`
//   svg {
//     height: 0.4rem;
//   }
// `;

// /* -------------------------------------------------------------------------------------------------
//  * useReleasesList
//  * -----------------------------------------------------------------------------------------------*/

// const useReleasesList = (entryId: string | number) => {
//   const { uid: contentTypeUid } = useTypedSelector(
//     (state) => state['content-manager_listView'].contentType
//   );
//   const listViewData = useTypedSelector((state) => state['content-manager_listView'].data);
//   // @ts-expect-error Fix when migrating to v5
//   const entriesIds = listViewData.map((entry) => entry.id);

//   const response = useGetMappedEntriesInReleasesQuery(
//     { contentTypeUid, entriesIds },
//     { skip: !entriesIds || !contentTypeUid || entriesIds.length === 0 }
//   );

//   const mappedEntriesInReleases = response.data || {};

//   // @ts-expect-error Fix when migrating releases
//   return mappedEntriesInReleases?.[entryId] || [];
// };

// /* -------------------------------------------------------------------------------------------------
//  * addColumnToTableHook
//  * -----------------------------------------------------------------------------------------------*/

// // TODO: Migrate to v5
// // interface AddColumnToTableHookArgs {
// //   layout: {
// //     components: Record<string, CMAdminConfiguration>;
// //     contentType: CMAdminConfiguration;
// //   };
// //   displayedHeaders: ListLayoutRow[];
// // }

// const addColumnToTableHook = ({ displayedHeaders, layout }: any) => {
//   const { contentType } = layout;

//   if (!contentType.options?.draftAndPublish) {
//     return { displayedHeaders, layout };
//   }

//   return {
//     displayedHeaders: [
//       ...displayedHeaders,
//       {
//         key: '__release_key__',
//         fieldSchema: { type: 'string' },
//         metadatas: { label: 'To be released in', searchable: true, sortable: false },
//         name: 'releasedAt',
//         cellFormatter: (props: Entity) => <ReleaseListCell {...props} />,
//       },
//     ],
//     layout,
//   };
// };

// /* -------------------------------------------------------------------------------------------------
//  * ReleaseListCell
//  * -----------------------------------------------------------------------------------------------*/

// interface ReleaseListCellProps {
//   id: Entity['id'];
// }

// const ReleaseListCell = ({ id }: ReleaseListCellProps) => {
//   const releases = useReleasesList(id);
//   const [visible, setVisible] = React.useState(false);
//   const buttonRef = React.useRef<HTMLButtonElement>(null);
//   const { formatMessage } = useIntl();

//   const handleTogglePopover = () => setVisible((prev) => !prev);

//   return (
//     <Flex onClick={(e) => e.stopPropagation()}>
//       <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
//         <ActionWrapper height="3.2rem" width="3.2rem">
//           <Typography style={{ maxWidth: '252px', cursor: 'pointer' }} textColor="neutral800">
//             {releases.length > 0
//               ? formatMessage(
//                   {
//                     id: 'content-releases.content-manager.list-view.releases-number',
//                     defaultMessage: '{number} {number, plural, one {release} other {releases}}',
//                   },
//                   {
//                     number: releases.length,
//                   }
//                 )
//               : '-'}
//           </Typography>
//           <Flex>
//             {/* {releases.length > 0 && <SortIcon />} */}
//             {visible && (
//               <Popover
//                 onDismiss={handleTogglePopover}
//                 source={buttonRef as React.MutableRefObject<HTMLElement>}
//                 spacing={16}
//               >
//                 <ul>
//                   {releases.map(
//                     // @ts-expect-error fix when migrating to v5
//                     ({ id, name }) => (
//                     <Box key={id} padding={3} as="li">
//                       <Link href={`/admin/plugins/content-releases/${id}`} isExternal={false}>
//                         {name}
//                       </Link>
//                     </Box>
//                   ))}
//                 </ul>
//               </Popover>
//             )}
//           </Flex>
//         </ActionWrapper>
//       </Button>
//     </Flex>
//   );
// };

// export { ReleaseListCell, addColumnToTableHook };
// export type { ReleaseListCellProps };
