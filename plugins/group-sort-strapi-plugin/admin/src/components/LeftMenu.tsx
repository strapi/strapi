import { useContext, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { parse, stringify } from 'qs';
import { styled } from 'styled-components';
import { Page, Permission, useQueryParams } from '@strapi/admin/strapi-admin';
import {
  useCollator,
  useFilter,
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
  StrapiTheme
} from '@strapi/design-system';
import { Struct } from '@strapi/types';
import { ArrowLeft } from '@strapi/icons';
import { useTranslation } from '../hooks/useTranslation';
import { PLUGIN_ID, UNDEFINED_GROUP_NAME } from '../../../shared/constants';
import { GroupAndArrangeContext } from './GroupAndArrangeContextProvider';

interface ContentManagerLink {
  permissions: Permission[];
  search: string | null;
  kind: string | null;
  title: string;
  to: string;
  uid: string;
  name: string;
  isDisplayed: boolean;
  placeOnTop?: boolean;
}

const SubNavHeaderWrapper = styled.div`
  h2 {
    font-size: ${({ theme }) => (theme as StrapiTheme).fontSizes[3]};
  }
`;

const SubNavLinkCustom = styled(SubNavLink)`
  color: ${({ theme }) => (theme as StrapiTheme).colors.primary600};
`;

const LeftMenu = () => {
  const { formatMessage, locale } = useTranslation();
  const { formatMessage: formatMessageIntl } = useIntl();

  // search text
  const [search, setSearch] = useState('');
  const {
    collectionTypes,
    groupNames,
    contentTypeUid,
    groupName,
    groupData,
    isLoading,
    globalSettings} = useContext(GroupAndArrangeContext);
  
  // indicates whether the collection type is open. Can be false on the main page of plugin
  const isCollectionTypeOpen = Boolean(contentTypeUid);
  // indicates whether group under collection type is open
  const isGroupOpen = Boolean(groupName) || groupName === '';

  // dictionary of collection types by their uid
  const collectionTypesDict = (collectionTypes || []).reduce((acc, collectionType) => {
    acc[collectionType.uid] = collectionType;
    return acc;
  }, {} as Record<string, Struct.ContentTypeSchema>);

  // links to collection type pages
  const collectionTypeLinks: ContentManagerLink[] = collectionTypes?.map((collectionType) => ({
      permissions: [],
      search: null,
      kind: collectionType.kind,
      title: collectionType.info.displayName,
      to: `/plugins/${PLUGIN_ID}/${collectionType.uid}`,
      uid: collectionType.uid,
      name: (collectionType.info as any).name,
      isDisplayed: (collectionType.info as any).isDisplayed,
  })) || [];
  
  // counts of group occurrences by name. Used to determine whether to put order field to parentheses in the title
  const nameOccurencesCount = groupNames?.reduce((acc, group) => {
    acc[group.groupName] = (acc[group.groupName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  // links to group pages
  const groupLinks: ContentManagerLink[] = groupNames?.map((group) => {
    const isUndefined = group.groupName === UNDEFINED_GROUP_NAME;
    const name = isUndefined ? formatMessage({
        id: 'left-menu.no-group.label',
        defaultMessage: 'Group and Arrange',
      }) : group.groupName;
    return {
      permissions: [],
      search: null,
      kind: null,
      placeOnTop: isUndefined,
      title: globalSettings?.alwaysShowFieldTypeInList || nameOccurencesCount[group.groupName] > 1
        ? `${name} (${group.orderField})`
        : name,
      to: `/plugins/${PLUGIN_ID}/${contentTypeUid}/${group.orderField}/${group.groupName}`,
      uid: contentTypeUid!,
      name: encodeURIComponent(group.groupName),
      isDisplayed: true,
    };
  }) || [];
  
  // stuff below mostly taken from LeftMenu of content-manager plugin

  const { startsWith } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const menu = useMemo(
    () =>
      [
        {
          id: 'collectionTypes',
          title: formatMessage({
            id: 'left-menu.list.collection-types',
            defaultMessage: 'Collection Types',
          }),
          searchable: true,
          formattable: true,
          links: collectionTypeLinks,
          enabled: !isCollectionTypeOpen && !isGroupOpen
        },
        {
          id: 'groups',
          title: formatMessage({
            id: 'left-menu.list.groups',
            defaultMessage: 'Groups',
          }),
          searchable: true,
          formattable: false,
          links: groupLinks,
          enabled: isCollectionTypeOpen
        },
      ].filter((section) => section.enabled)
      .map((section) => ({
        ...section,
        links: section.links
          ?.filter((link) => startsWith(link.title, search))
          .sort((a, b) => a.placeOnTop ? -1 : formatter.compare(a.title, b.title))
          .map((link) => {
            return {
              ...link,
              title: section.formattable
                ? formatMessageIntl({ id: link.title, defaultMessage: link.title })
                : link.title,
            };
          }),
      })),
    [collectionTypes, groupData, search, formatMessage, startsWith, formatMessageIntl, formatter]
  );

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }: { target: { value: string } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: 'left-menu.header.name',
    defaultMessage: 'Group and Arrange',
  });

  if(isLoading) {
    return <Page.Loading />;
  }

  return (
    <SubNav aria-label={label}>
      <SubNavHeader
        label={label}
        searchable
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
        searchLabel={formatMessage({
          id: 'left-menu.search.label',
          defaultMessage: 'Search for a content type',
        })}
      />
      {isCollectionTypeOpen && collectionTypes?.length && <>
      <SubNavLinkCustom
        href={`/admin/plugins/${PLUGIN_ID}`}
        icon={<ArrowLeft />}>
        {formatMessage({
          id: 'left-menu.back-to-collection-types.label',
          defaultMessage: 'Back to collection types',
        })}
      </SubNavLinkCustom>
      <SubNavHeaderWrapper>
        <SubNavHeader label={collectionTypesDict[contentTypeUid!].info.displayName} />
      </SubNavHeaderWrapper>
      </>}
      <SubNavSections>
        {menu.map((section) => {
          return (
            <SubNavSection
              key={section.id}
              label={section.title}
              badgeLabel={section.links?.length.toString()}
            >
              {section.links?.map((link) => {
                return (
                  <SubNavLink
                    tag={NavLink}
                    key={link.uid}
                    to={{
                      pathname: link.to,
                      search: stringify({
                        ...parse(link.search ?? '')
                      }),
                    }}
                    width="100%"
                    isSubSectionChild={false}
                  >

                    {link.title}
                  </SubNavLink>
                );
              })}
            </SubNavSection>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export { LeftMenu };
