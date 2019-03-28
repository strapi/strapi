// Helpers.
const { auth, login } = require('../../../test/helpers/auth');
const waitRestart = require('../../../test/helpers/waitRestart');
const createRequest = require('../../../test/helpers/request');
const _ = require('lodash');

let rq;
let graphqlQuery;

// utils
const selectFields = doc => _.pick(doc, ['id', 'name']);

const documentModel = {
  attributes: [
    {
      name: 'title',
      params: {
        appearance: {
          WYSIWYG: false,
        },
        multiple: false,
        type: 'string',
      },
    },
    {
      name: 'content',
      params: {
        appearance: {
          WYSIWYG: true,
        },
        multiple: false,
        type: 'text',
      },
    },
  ],
  connection: 'default',
  name: 'document',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: [
    {
      name: 'name',
      params: {
        appearance: {
          WYSIWYG: false,
        },
        multiple: false,
        type: 'string',
      },
    },
    {
      name: 'documents',
      params: {
        dominant: true,
        nature: 'manyToMany',
        target: 'document',
        key: 'labels',
      },
    },
  ],
  connection: 'default',
  name: 'label',
  description: '',
  collectionName: '',
};

describe('Test Graphql Relations API End to End', () => {
  beforeAll(async () => {
    await createRequest()({
      url: '/auth/local/register',
      method: 'POST',
      body: auth,
    }).catch(err => {
      if (err.error.message.includes('Email is already taken.')) return;
      throw err;
    });

    const body = await login();

    rq = createRequest({
      headers: {
        Authorization: `Bearer ${body.jwt}`,
      },
    });

    graphqlQuery = body => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  });

  describe('Generate test APIs', () => {
    beforeEach(() => waitRestart(), 30000);
    afterAll(() => waitRestart(), 30000);

    test('Create new document API', async () => {
      const res = await rq({
        url: '/content-type-builder/models',
        method: 'POST',
        body: documentModel,
      });

      expect(res.statusCode).toBe(200);
    });

    test('Create new label API', async () => {
      const res = await rq({
        url: '/content-type-builder/models',
        method: 'POST',
        body: labelModel,
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Test relations features', () => {
    let data = {
      labels: [],
      documents: [],
    };
    const labelsPayload = [{ name: 'label 1' }, { name: 'label 2' }];
    const documentsPayload = [{ title: 'document 1' }, { title: 'document 2' }];

    test.each(labelsPayload)('Create label %o', async label => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createLabel($input: createLabelInput) {
            createLabel(input: $input) {
              label {
                name
              }
            }
          }
        `,
        variables: {
          input: {
            data: label,
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toEqual({
        data: {
          createLabel: {
            label,
          },
        },
      });
    });

    test('List labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              id
              name
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels: labelsPayload,
        },
      });

      // assign for later use
      data.labels = res.body.data.labels;
    });

    test.each(documentsPayload)('Create document linked to every labels %o', async document => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createDocument($input: createDocumentInput) {
            createDocument(input: $input) {
              document {
                title
                labels {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: {
          input: {
            data: {
              ...document,
              labels: data.labels.map(t => t.id),
            },
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);

      expect(body).toMatchObject({
        data: {
          createDocument: {
            document: {
              ...selectFields(document),
              labels: data.labels.map(selectFields),
            },
          },
        },
      });
    });

    test('List documents with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents {
              id
              title
              labels {
                id
                name
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          documents: documentsPayload.map(document => ({
            ...selectFields(document),
            labels: data.labels.map(selectFields),
          })),
        },
      });

      // assign for later use
      data.documents = res.body.data.documents;
    });

    test('List Labels with documents', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              id
              name
              documents {
                id
                title
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels: labelsPayload.map(label => ({
            ...selectFields(label),
            documents: data.documents.map(selectFields),
          })),
        },
      });

      // assign for later use
      data.labels = res.body.data.labels;
    });

    test('Deep query', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents(where: { labels: { name_contains: "label 1" } }) {
              id
              title
              labels {
                id
                name
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          documents: data.documents,
        },
      });
    });

    test('Update Document relations removes correctly a relation', async () => {
      // if I remove a label from an document is it working
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateDocument($input: updateDocumentInput) {
            updateDocument(input: $input) {
              document {
                id
                title
                labels {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: {
          input: {
            where: {
              id: data.documents[0].id,
            },
            data: {
              labels: [data.labels[0].id],
            },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          updateDocument: {
            document: {
              ...selectFields(data.documents[0]),
              labels: [selectFields(data.labels[0])],
            },
          },
        },
      });
    });

    test('Delete Labels and test Documents relations', async () => {
      for (let label of data.labels) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteLabel($input: deleteLabelInput) {
              deleteLabel(input: $input) {
                label {
                  name
                }
              }
            }
          `,
          variables: {
            input: {
              where: {
                id: label.id,
              },
            },
          },
        });

        expect(res.statusCode).toBe(200);
      }

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents {
              id
              title
              labels {
                id
                name
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          documents: data.documents.map(document => ({
            ...selectFields(document),
            labels: [],
          })),
        },
      });
    });

    test('Delete Documents', async () => {
      for (let document of data.documents) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteDocument($input: deleteDocumentInput) {
              deleteDocument(input: $input) {
                document {
                  title
                }
              }
            }
          `,
          variables: {
            input: {
              where: {
                id: document.id,
              },
            },
          },
        });

        expect(res.statusCode).toBe(200);
      }
    });
  });

  describe('Delete test APIs', () => {
    beforeEach(() => waitRestart(), 30000);
    afterAll(() => waitRestart(), 30000);

    test('Delete label API', async () => {
      await rq({
        url: '/content-type-builder/models/document',
        method: 'DELETE',
      }).then(res => {
        expect(res.statusCode).toBe(200);
      });
    });

    test('Delete label API', async () => {
      await rq({
        url: '/content-type-builder/models/label',
        method: 'DELETE',
      }).then(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });
});
