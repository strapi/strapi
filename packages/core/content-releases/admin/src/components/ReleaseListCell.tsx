import * as React from 'react';

import { Box, Flex, Popover, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { SortIcon } from '@strapi/helper-plugin';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import type { CMAdminConfiguration, ListLayoutRow } from '@strapi/admin/strapi-admin';

const Button = styled.button`
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
  &:hover {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }
  &:active {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral400};
      }
    }
  }
`;

const ActionWrapper = styled(Flex)`
  svg {
    height: ${4 / 16}rem;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * addColumnToTableHook
 * -----------------------------------------------------------------------------------------------*/

interface AddColumnToTableHookArgs {
  layout: {
    components: Record<string, CMAdminConfiguration>;
    contentType: CMAdminConfiguration;
  };
  displayedHeaders: ListLayoutRow[];
}

const addColumnToTableHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        key: '__release_key__',
        fieldSchema: { type: 'string' },
        metadatas: { label: 'To be released in', searchable: true, sortable: false },
        name: 'releasedAt',
        cellFormatter: (props: object) => <ReleaseListCell {...props} />,
      },
    ],
    layout,
  };
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseListCell
 * -----------------------------------------------------------------------------------------------*/

interface ReleaseListCellProps {}

const ReleaseListCell = (props: any) => {
  const {
    // releases,
  } = props;
  const [visible, setVisible] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const releases = [
    { title: 'R2', id: 68 },
    { title: 'R3', id: 69 },
  ];
  const totalReleases = `${releases.length} release`;

  const handleTogglePopover = () => setVisible((prev) => !prev);

  return (
    <Flex onClick={(e) => e.stopPropagation()}>
      <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
        <ActionWrapper height="2rem" width="2rem">
          <Typography style={{ maxWidth: '252px', cursor: 'pointer' }} textColor="neutral800">
            {totalReleases}
          </Typography>
          <Flex>
            <SortIcon />
            {visible && (
              <Popover
                onDismiss={handleTogglePopover}
                source={buttonRef as React.MutableRefObject<HTMLElement>}
                spacing={16}
              >
                <ul>
                  {releases.map(({ id, title }) => (
                    <Box key={id} padding={3} as="li">
                      {/* @ts-expect-error – error with inferring the props from the as component */}
                      <Link to={`/plugins/content-releases/${id}`} as={NavLink} isExternal={false}>
                        {title}
                      </Link>
                    </Box>
                  ))}
                </ul>
              </Popover>
            )}
          </Flex>
        </ActionWrapper>
      </Button>
    </Flex>
  );
};

export { ReleaseListCell, addColumnToTableHook };
export type { ReleaseListCellProps };
