// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const createModelsUtils = require('../../../test/helpers/models');
const _ = require('lodash');

let rq;
let graphqlQuery;
let modelsUtils;

// utils
const selectFields = doc => _.pick(doc, ['id', 'name']);

const documentModel = {
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
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    graphqlQuery = body => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createModels([documentModel, labelModel]);
  }, 60000);

  afterAll(() => modelsUtils.deleteModels(['document', 'label']), 60000);

  describe('Test relations features', () => {
    let data = {
      labels: [],
      documents: [],
    };
    const labelsPayload = [{ name: 'label 1' }, { name: 'label 2' }];
    const documentsPayload = [{ name: 'document 1' }, { name: 'document 2' }];

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

    test.each(documentsPayload)(
      'Create document linked to every labels %o',
      async document => {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation createDocument($input: createDocumentInput) {
              createDocument(input: $input) {
                document {
                  name
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
                labels: expect.arrayContaining(data.labels.map(selectFields)),
              },
            },
          },
        });
      }
    );

    test('List documents with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents {
              id
              name
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
          documents: expect.arrayContaining(
            data.documents.map(document => ({
              ...selectFields(document),
              labels: expect.arrayContaining(data.labels.map(selectFields)),
            }))
          ),
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
          labels: expect.arrayContaining(
            data.labels.map(label => ({
              ...selectFields(label),
              documents: expect.arrayContaining(
                data.documents.map(selectFields)
              ),
            }))
          ),
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
              name
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
          documents: expect.arrayContaining(data.documents),
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
                name
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
              name
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
          documents: expect.arrayContaining(
            data.documents.map(document => ({
              ...selectFields(document),
              labels: [],
            }))
          ),
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
                  name
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
});
