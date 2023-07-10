import React from 'react';

import { Breadcrumbs as BaseBreadcrumbs, Crumb, CrumbLink } from '@strapi/design-system/v2';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { BreadcrumbsDefinition } from '../../constants';

import { CrumbSimpleMenuAsync } from './CrumbSimpleMenuAsync';

export const Breadcrumbs = ({ breadcrumbs, onChangeFolder, currentFolderId, ...props }) => {
  const { formatMessage } = useIntl();

  return (
    <BaseBreadcrumbs {...props}>
      {breadcrumbs.map((crumb, index) => {
        if (Array.isArray(crumb)) {
          return (
            <CrumbSimpleMenuAsync
              parentsToOmit={[...breadcrumbs]
                .splice(index + 1, breadcrumbs.length - 1)
                .map((parent) => parent.id)}
              key={`breadcrumb-${crumb?.id ?? 'menu'}`}
              currentFolderId={currentFolderId}
              onChangeFolder={onChangeFolder}
            />
          );
        }

        const isCurrentFolderMediaLibrary = crumb.id === null && currentFolderId === undefined;

        if (currentFolderId !== crumb.id && !isCurrentFolderMediaLibrary) {
          return (
            <CrumbLink
              key={`breadcrumb-${crumb?.id ?? 'root'}`}
              as={onChangeFolder ? 'button' : NavLink}
              type={onChangeFolder && 'button'}
              to={onChangeFolder ? undefined : crumb.href}
              onClick={onChangeFolder && (() => onChangeFolder(crumb.id, crumb.path))}
            >
              {crumb.label?.id ? formatMessage(crumb.label) : crumb.label}
            </CrumbLink>
          );
        }

        return (
          <Crumb
            key={`breadcrumb-${crumb?.id ?? 'root'}`}
            isCurrent={index + 1 === breadcrumbs.length}
          >
            {crumb.label?.id ? formatMessage(crumb.label) : crumb.label}
          </Crumb>
        );
      })}
    </BaseBreadcrumbs>
  );
};

Breadcrumbs.defaultProps = {
  currentFolderId: undefined,
  onChangeFolder: undefined,
};

Breadcrumbs.propTypes = {
  breadcrumbs: BreadcrumbsDefinition.isRequired,
  currentFolderId: PropTypes.number,
  onChangeFolder: PropTypes.func,
};
