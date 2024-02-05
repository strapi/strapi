import * as React from 'react';

import { ContentLayout, HeaderLayout, Main, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ArrowLeft } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

/* -------------------------------------------------------------------------------------------------
 * VersionHeader
 * -----------------------------------------------------------------------------------------------*/

interface VersionHeaderProps {
  headerId: string;
  version: Contracts.HistoryVersions.HistoryVersionDataResponse;
}

const VersionHeader = ({ headerId, version }: VersionHeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <HeaderLayout
      id={headerId}
      title={`History version ${version.id}`}
      navigationAction={
        <Link
          startIcon={<ArrowLeft />}
          as={NavLink}
          // @ts-expect-error - types are not inferred correctly through the as prop.
          to=".."
        >
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionContent
 * -----------------------------------------------------------------------------------------------*/

interface VersionContentProps {
  version: Contracts.HistoryVersions.HistoryVersionDataResponse;
}

const VersionContent = ({ version }: VersionContentProps) => {
  return (
    <ContentLayout>
      <Typography>TODO: display content for version {version.id}</Typography>
    </ContentLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionDetails
 * -----------------------------------------------------------------------------------------------*/

interface VersionDetailsProps {
  version: Contracts.HistoryVersions.HistoryVersionDataResponse | undefined;
}

const VersionDetails = ({ version }: VersionDetailsProps) => {
  const headerId = React.useId();

  if (!version) {
    // TODO: handle selected version not found when the designs are ready
    return <Main grow={1} />;
  }

  return (
    <Main grow={1} labelledBy={headerId}>
      <VersionHeader version={version} headerId={headerId} />
      <VersionContent version={version} />
    </Main>
  );
};

export { VersionDetails };
