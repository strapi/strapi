import * as React from 'react';

import { SubNav } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  Searchbar,
  Typography,
  useCollator,
  useFilter,
  Divider,
  Loader,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { useContentManagerInitData } from '../hooks/useContentManagerInitData';
import { useTypedSelector } from '../modules/hooks';
import {
  countTreeLinks,
  buildContentStructureSection,
  flattenTreeLinks,
  type LinkTreeNode,
} from '../utils/contentStructure';
import { getTranslation } from '../utils/translations';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';

const LeftMenu = ({ isFullPage = false }: { isFullPage?: boolean }) => {
  const [search, setSearch] = React.useState('');
  const { formatMessage, locale } = useIntl();
  const { search: locationSearch } = useLocation();
  const i18nLocale = new URLSearchParams(locationSearch).get('plugins[i18n][locale]');

  // Initialize Content Manager data to ensure links are available
  const { isLoading } = useContentManagerInitData();

  const collectionTypeLinks = useTypedSelector(
    (state) => state['content-manager'].app.collectionTypeLinks
  );

  const singleTypeLinks = useTypedSelector((state) => state['content-manager'].app.singleTypeLinks);

  const contentStructure = useTypedSelector(
    (state) => state['content-manager'].app.contentStructure
  );

  const { contains } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const compareLinks = React.useCallback(
    (a: ContentManagerLink, b: ContentManagerLink) => {
      return formatter.compare(a.title, b.title);
    },
    [formatter]
  );

  const collectionTypesLabel = formatMessage({
    id: getTranslation('components.LeftMenu.collection-types'),
    defaultMessage: 'Collection Types',
  });

  const singleTypesLabel = formatMessage({
    id: getTranslation('components.LeftMenu.single-types'),
    defaultMessage: 'Single Types',
  });

  const sections = React.useMemo(() => {
    const collectionTypesSection = buildContentStructureSection({
      id: 'collectionTypes',
      groups: contentStructure?.collectionTypes ?? [],
      title: collectionTypesLabel,
      links: collectionTypeLinks,
      compareLinks,
    });

    const singleTypesSection = buildContentStructureSection({
      id: 'singleTypes',
      groups: contentStructure?.singleTypes ?? [],
      title: singleTypesLabel,
      links: singleTypeLinks,
      compareLinks,
    });

    return [collectionTypesSection, singleTypesSection];
  }, [
    collectionTypesLabel,
    collectionTypeLinks,
    singleTypesLabel,
    contentStructure,
    singleTypeLinks,
    compareLinks,
  ]);

  const trimmedSearch = search.trim();

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const label = formatMessage({
    id: getTranslation('header.name'),
    defaultMessage: 'Content Manager',
  });

  const formatLinkTitle = (link: ContentManagerLink) =>
    formatMessage({ id: link.title, defaultMessage: link.title });

  const linkTo = (link: ContentManagerLink) => ({
    pathname: link.to,
    search: i18nLocale ? `?plugins[i18n][locale]=${i18nLocale}` : '',
  });

  const renderMenuItem = (node: LinkTreeNode, depth: number): React.ReactNode => {
    if (node.type === 'link') {
      return (
        <SubNav.Link
          label={formatLinkTitle(node.link)}
          to={linkTo(node.link)}
          key={node.link.uid}
          depth={depth}
        />
      );
    }

    return (
      <SubNav.Folder key={node.id} label={node.name} depth={depth} defaultOpen>
        {node.children.map((child) => renderMenuItem(child, depth + 1))}
      </SubNav.Folder>
    );
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <SubNav.Main aria-label={label} isFullPage={isFullPage}>
        <SubNav.Header label={label} />
        <Divider />
        <Flex padding={4} justifyContent="center">
          <Loader />
        </Flex>
      </SubNav.Main>
    );
  }

  const searchBar = (
    <Flex
      paddingLeft={{
        initial: 3,
        large: 5,
      }}
      paddingRight={{
        initial: 3,
        large: 5,
      }}
      paddingTop={5}
      paddingBottom={{ initial: 1, large: 0 }}
      gap={3}
      direction="column"
      alignItems="stretch"
    >
      <Searchbar
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
        placeholder={formatMessage({
          id: 'search.placeholder',
          defaultMessage: 'Search',
        })}
        size="S"
        // eslint-disable-next-line react/no-children-prop
        children={undefined}
        name={'search_contentType'}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
      />
    </Flex>
  );

  return (
    <SubNav.Main aria-label={label} isFullPage={isFullPage}>
      <SubNav.Header label={label} />
      <Divider />
      <Box
        position={isFullPage ? 'sticky' : 'static'}
        top={isFullPage ? '0px' : undefined}
        zIndex={isFullPage ? 2 : undefined}
        background={isFullPage ? 'neutral100' : 'neutral0'}
      >
        {searchBar}
      </Box>
      <SubNav.Content>
        <SubNav.Sections>
          {sections.map((section) => {
            const matches = trimmedSearch
              ? flattenTreeLinks(section.tree)
                  .filter(({ link }) => contains(formatLinkTitle(link), trimmedSearch))
                  .sort((a, b) => compareLinks(a.link, b.link))
              : null;

            const count = matches ? matches.length : countTreeLinks(section.tree);

            const sectionItems = matches
              ? matches.map(({ link, path }) => (
                  <SubNav.Link
                    label={formatLinkTitle(link)}
                    to={linkTo(link)}
                    key={link.uid}
                    endAction={
                      path.length > 0 ? (
                        <Typography variant="pi" textColor="neutral500">
                          {path.join(' / ')}
                        </Typography>
                      ) : undefined
                    }
                  />
                ))
              : section.tree.map((node) => renderMenuItem(node, 0));

            return (
              <SubNav.Section key={section.id} label={section.title} badgeLabel={count.toString()}>
                {sectionItems}
              </SubNav.Section>
            );
          })}
        </SubNav.Sections>
      </SubNav.Content>
    </SubNav.Main>
  );
};

export { LeftMenu };
