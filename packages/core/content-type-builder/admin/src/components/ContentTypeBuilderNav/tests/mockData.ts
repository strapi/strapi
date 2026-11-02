import type { FlatMenuSection, FolderMenuSection } from '../hooks/useContentTypeBuilderMenu';
import type { ContentTypeLink } from '../lib/buildFolderTree';
import type { UID } from '@strapi/types';

const collectionTypeLinks: ContentTypeLink[] = [
  {
    uid: 'api::address.address' as UID.ContentType,
    to: '/plugins/content-type-builder/content-types/api::address.address',
    title: 'address',
    status: 'UNCHANGED',
  },
  {
    uid: 'api::category.category' as UID.ContentType,
    to: '/plugins/content-type-builder/content-types/api::category.category',
    title: 'category',
    status: 'UNCHANGED',
  },
];

const singleTypeLinks: ContentTypeLink[] = [
  {
    uid: 'api::homepage.homepage' as UID.ContentType,
    to: '/plugins/content-type-builder/content-types/api::homepage.homepage',
    title: 'Homepage',
    status: 'UNCHANGED',
  },
];

export const mockCreateCollectionType = jest.fn();
export const mockCreateSingleType = jest.fn();

// The folder-backed sections (collection & single types), rendered through <FolderNavSection />.
export const mockFolderSections: FolderMenuSection[] = [
  {
    section: 'collectionTypes',
    sectionId: 'models',
    title: 'Collection Types',
    createTypeLabel: 'New Collection-Type',
    onCreateContentType: mockCreateCollectionType,
    links: collectionTypeLinks,
  },
  {
    section: 'singleTypes',
    sectionId: 'singleTypes',
    title: 'Single Types',
    createTypeLabel: 'New Single-Type',
    onCreateContentType: mockCreateSingleType,
    links: singleTypeLinks,
  },
];

// The flat (non-folder) sections. Only "components" is rendered by the nav.
export const mockFlatSections: FlatMenuSection[] = [
  {
    name: 'components',
    title: {
      id: 'content-type-builder.menu.section.components.name.',
      defaultMessage: 'Components',
    },
    customLink: {
      id: 'content-type-builder.button.component.create',
      defaultMessage: 'Create a new component',
      onClick: () => {},
    },
    links: [
      {
        name: 'basic',
        title: 'basic',
        links: [
          {
            name: 'basic.simple',
            to: '/plugins/content-type-builder/component-categories/basic/basic.simple',
            title: 'simple',
            status: 'UNCHANGED',
          },
        ],
      },
      {
        name: 'default',
        title: 'default',
        links: [
          {
            name: 'default.closingperiod',
            to: '/plugins/content-type-builder/component-categories/default/default.closingperiod',
            title: 'closingperiod',
            status: 'UNCHANGED',
          },
          {
            name: 'default.dish',
            to: '/plugins/content-type-builder/component-categories/default/default.dish',
            title: 'dish',
            status: 'UNCHANGED',
          },
        ],
      },
    ],
    linksCount: 3,
  },
];
