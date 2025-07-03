import { EntriesInRelease } from '../../utils/tree';
import { mockedContentTypeModelsMap, mockedEntries } from '../tests/mocks';
import createReleaseService from '../release';

describe('Release service - buildReleaseTree', () => {
  let releaseService: any;

  beforeEach(() => {
    releaseService = createReleaseService({ strapi: {} as any });
  });

  it('should create an empty tree when no entries are provided', async () => {
    const entriesInRelease: EntriesInRelease[] = [];
    const contentTypeModelsMap = {};

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([]);
  });

  it('should add entries to the tree without relations', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: { id: 1, documentId: 'doc-1' },
        type: 'publish',
      },
      {
        contentType: 'api::page.page',
        entry: { id: 2, documentId: 'doc-2' },
        type: 'unpublish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
        },
      },
      'api::page.page': {
        attributes: {
          content: { type: 'text' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::article.article',
        id: '1',
        documentId: 'doc-1',
        type: 'publish',
        _depth: 0,
        children: [],
      },
      {
        contentType: 'api::page.page',
        id: '2',
        documentId: 'doc-2',
        type: 'unpublish',
        _depth: 0,
        children: [],
      },
    ]);
  });

  it('should handle entries with relations', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          categories: [{ id: 3, documentId: 'doc-3' }],
        },
        type: 'publish',
      },
      {
        contentType: 'api::category.category',
        entry: { id: 3, documentId: 'doc-3' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          categories: {
            type: 'relation',
            target: 'api::category.category',
          },
        },
      },
      'api::category.category': {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::category.category',
        id: '3',
        documentId: 'doc-3',
        type: 'publish',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            _depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });

  it('should add relations with mappedBy or inversedBy to the root', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          categories: [{ id: 3, documentId: 'doc-3' }],
          author: { id: 4, documentId: 'doc-4' },
        },
        type: 'publish',
      },
      {
        contentType: 'api::category.category',
        entry: { id: 3, documentId: 'doc-3' },
        type: 'publish',
      },
      {
        contentType: 'api::author.author',
        entry: { id: 4, documentId: 'doc-4' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          categories: {
            type: 'relation',
            target: 'api::category.category',
          },
          author: {
            type: 'relation',
            target: 'api::author.author',
            inversedBy: 'articles',
          },
        },
      },
      'api::category.category': {
        attributes: {
          name: { type: 'string' },
        },
      },
      'api::author.author': {
        attributes: {
          name: { type: 'string' },
          articles: {
            type: 'relation',
            target: 'api::article.article',
            mappedBy: 'author',
          },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::category.category',
        id: '3',
        documentId: 'doc-3',
        type: 'publish',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            _depth: 1,
            children: [],
          },
        ],
      },
      {
        contentType: 'api::author.author',
        id: '4',
        documentId: 'doc-4',
        type: 'publish',
        _depth: 0,
        children: [],
      },
    ]);
  });

  it('should exclude special relation fields (updatedBy, createdBy, localizations)', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          createdBy: { id: 101 },
          updatedBy: { id: 102 },
          localizations: [{ id: 103 }],
          category: { id: 3, documentId: 'doc-3' },
        },
        type: 'publish',
      },
      {
        contentType: 'api::category.category',
        entry: { id: 3, documentId: 'doc-3' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          category: {
            type: 'relation',
            target: 'api::category.category',
          },
          createdBy: {
            type: 'relation',
            target: 'admin::user',
          },
          updatedBy: {
            type: 'relation',
            target: 'admin::user',
          },
          localizations: {
            type: 'relation',
            target: 'api::article.article',
          },
        },
      },
      'api::category.category': {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::category.category',
        id: '3',
        documentId: 'doc-3',
        type: 'publish',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            _depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });

  it('should handle localized entries correctly', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          locale: 'en',
          categories: [{ id: 3, documentId: 'doc-3', locale: 'en' }],
        },
        type: 'publish',
      },
      {
        contentType: 'api::category.category',
        entry: { id: 3, documentId: 'doc-3', locale: 'en' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          categories: {
            type: 'relation',
            target: 'api::category.category',
          },
        },
      },
      'api::category.category': {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::category.category',
        id: '3',
        documentId: 'doc-3',
        type: 'publish',
        locale: 'en',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            locale: 'en',
            _depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });

  it('should manage multiple parent-child relationships and choose the deepest parent', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          categories: [{ id: 3, documentId: 'doc-3' }],
          tags: [{ id: 4, documentId: 'doc-4' }],
        },
        type: 'publish',
      },
      {
        contentType: 'api::category.category',
        entry: { id: 3, documentId: 'doc-3' },
        type: 'publish',
      },
      {
        contentType: 'api::tag.tag',
        entry: { id: 4, documentId: 'doc-4' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          categories: {
            type: 'relation',
            target: 'api::category.category',
          },
          tags: {
            type: 'relation',
            target: 'api::tag.tag',
          },
        },
      },
      'api::category.category': {
        attributes: {
          name: { type: 'string' },
        },
      },
      'api::tag.tag': {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::category.category',
        id: '3',
        documentId: 'doc-3',
        type: 'publish',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            _depth: 1,
            children: [],
          },
        ],
      },
      {
        contentType: 'api::tag.tag',
        id: '4',
        documentId: 'doc-4',
        type: 'publish',
        _depth: 0,
        children: [],
      },
    ]);
  });

  it('should skip null relation values', async () => {
    const entriesInRelease = [
      {
        contentType: 'api::article.article',
        entry: {
          id: 1,
          documentId: 'doc-1',
          category: null,
          tags: [null, { id: 4, documentId: 'doc-4' }, null],
        },
        type: 'publish',
      },
      {
        contentType: 'api::tag.tag',
        entry: { id: 4, documentId: 'doc-4' },
        type: 'publish',
      },
    ];

    const contentTypeModelsMap = {
      'api::article.article': {
        attributes: {
          title: { type: 'string' },
          category: {
            type: 'relation',
            target: 'api::category.category',
          },
          tags: {
            type: 'relation',
            target: 'api::tag.tag',
          },
        },
      },
      'api::tag.tag': {
        attributes: {
          name: { type: 'string' },
        },
      },
    };

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::tag.tag',
        id: '4',
        documentId: 'doc-4',
        type: 'publish',
        _depth: 0,
        children: [
          {
            contentType: 'api::article.article',
            id: '1',
            documentId: 'doc-1',
            type: 'publish',
            _depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });

  it('should handle deep nested releases', async () => {
    const entriesInRelease = mockedEntries;

    const contentTypeModelsMap = mockedContentTypeModelsMap;

    const result = await releaseService.buildReleaseTree(entriesInRelease, contentTypeModelsMap);

    expect(result).toEqual([
      {
        contentType: 'api::tag.tag',
        id: '8',
        documentId: 'ww104qpfnk1njkjbugxh2259',
        type: 'publish',
        locale: 'en',
        _depth: 0,
        children: [
          {
            contentType: 'api::kitchensink.kitchensink',
            id: '40',
            documentId: 'fk3ppvivas06ovk2s3efkkzb',
            type: 'publish',
            locale: 'en',
            _depth: 1,
            children: [
              {
                contentType: 'api::menu.menu',
                id: '5',
                documentId: 'fzc3iofrkufxl75qcrjqkt8t',
                type: 'publish',
                locale: null,
                _depth: 2,
                children: [],
              },
            ],
          },
          {
            contentType: 'api::tag.tag',
            id: '9',
            documentId: 'pqtugnynmx5mvnhkgcaf4np8',
            type: 'publish',
            locale: 'en',
            _depth: 1,
            children: [
              {
                contentType: 'api::homepage.homepage',
                id: '1',
                documentId: 'eobknun5egzh3rmc7au0zerm',
                type: 'publish',
                locale: 'en',
                _depth: 2,
                children: [],
              },
            ],
          },
        ],
      },
      {
        contentType: 'api::tag.tag',
        id: '13',
        documentId: 'jwio3bitz25zbqz9iqik1rpo',
        type: 'unpublish',
        locale: 'en',
        _depth: 0,
        children: [
          {
            contentType: 'api::tag.tag',
            id: '15',
            documentId: 'tih3lm66pidqnssaqx5wf9kt',
            type: 'unpublish',
            locale: 'en',
            _depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });
});
