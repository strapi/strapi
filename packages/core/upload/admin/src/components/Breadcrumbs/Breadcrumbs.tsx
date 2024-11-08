import {
  Breadcrumbs as BaseBreadcrumbs,
  Crumb,
  CrumbLink,
  BreadcrumbsProps as BaseBreadcrumbsProps,
} from '@strapi/design-system';
import { useIntl, MessageDescriptor } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';

import { CrumbSimpleMenuAsync } from './CrumbSimpleMenuAsync';

export type CrumbDefinition = {
  id?: number | null;
  label?: MessageDescriptor | string;
  href?: string;
  path?: string;
};

export interface BreadcrumbsProps extends BaseBreadcrumbsProps {
  breadcrumbs: Array<CrumbDefinition>;
  currentFolderId?: number;
  onChangeFolder?: (id: number, path?: string) => void;
}

export const Breadcrumbs = ({
  breadcrumbs,
  onChangeFolder,
  currentFolderId,
  ...props
}: BreadcrumbsProps) => {
  const { formatMessage } = useIntl();

  return (
    <BaseBreadcrumbs {...props}>
      {breadcrumbs.map((crumb, index) => {
        if (Array.isArray(crumb)) {
          return (
            <CrumbSimpleMenuAsync
              parentsToOmit={[...breadcrumbs]
                .splice(index + 1, breadcrumbs.length - 1)
                .map((parent) => parent.id!)}
              key={`breadcrumb-${crumb?.id ?? 'menu'}`}
              currentFolderId={currentFolderId}
              onChangeFolder={onChangeFolder}
            />
          );
        }

        const isCurrentFolderMediaLibrary = crumb.id === null && currentFolderId === undefined;

        if (currentFolderId !== crumb.id && !isCurrentFolderMediaLibrary) {
          if (onChangeFolder) {
            return (
              <CrumbLink
                key={`breadcrumb-${crumb?.id ?? 'root'}`}
                type="button"
                onClick={() => onChangeFolder(crumb.id!, crumb.path)}
              >
                {typeof crumb.label !== 'string' && crumb.label?.id
                  ? formatMessage(crumb.label)
                  : (crumb.label as string)}
              </CrumbLink>
            );
          }
          return (
            <CrumbLink
              key={`breadcrumb-${crumb?.id ?? 'root'}`}
              to={crumb.href}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - `tag` prop is not defined in the `BaseLinkProps` type
              tag={ReactRouterLink}
            >
              {typeof crumb.label !== 'string' && crumb.label?.id
                ? formatMessage(crumb.label)
                : (crumb.label as string)}
            </CrumbLink>
          );
        }

        return (
          <Crumb
            key={`breadcrumb-${crumb?.id ?? 'root'}`}
            isCurrent={index + 1 === breadcrumbs.length}
          >
            {typeof crumb.label !== 'string' && crumb.label?.id
              ? formatMessage(crumb.label)
              : (crumb.label as string)}
          </Crumb>
        );
      })}
    </BaseBreadcrumbs>
  );
};
