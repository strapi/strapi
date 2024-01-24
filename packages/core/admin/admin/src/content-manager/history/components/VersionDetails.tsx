import * as React from 'react';

import { ContentLayout, HeaderLayout, Main, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';

const VersionDetails = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const headerId = React.useId();

  return (
    <Main grow={1} labelledBy={headerId}>
      <HeaderLayout
        id={headerId}
        title="History"
        navigationAction={
          <Link
            startIcon={<ArrowLeft />}
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
            as={NavLink}
            // @ts-expect-error - types are not inferred correctly through the as prop.
            to=""
          >
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      <ContentLayout>
        <Typography>Content</Typography>
      </ContentLayout>
    </Main>
  );
};

export { VersionDetails };
