'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const data = {};

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Upload a single image', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFile($file: Upload!) {
            upload(file: $file) {
              data {
                id
                attributes {
                  name
                  mime
                  url
                }
              }
            }
          }
        `,
        variables: {
          file: null,
        },
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          data: {
            id: expect.anything(),
            attributes: {
              name: 'rec.jpg',
              mime: 'image/jpeg',
              url: expect.any(String),
            },
          },
        },
      },
    });

    data.file = res.body.data.upload.data;
  });

  test('Upload multiple images', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFiles($files: [Upload]!) {
            multipleUpload(files: $files) {
              data {
                id
                attributes {
                  name
                  mime
                  url
                }
              }
            }
          }
        `,
        variables: {
          files: [null, null],
        },
      }),
      map: JSON.stringify({
        nFile0: ['variables.files.0'],
        nFile1: ['variables.files.1'],
      }),
      nFile0: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.multipleUpload).toHaveLength(2);
    expect(res.body).toEqual({
      data: {
        multipleUpload: expect.arrayContaining([
          expect.objectContaining({
            data: {
              id: expect.anything(),
              attributes: {
                name: 'rec.jpg',
                mime: 'image/jpeg',
                url: expect.any(String),
              },
            },
          }),
        ]),
      },
    });
  });

  test('Upload a single pdf', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFile($file: Upload!) {
            upload(file: $file) {
              data {
                id
                attributes {
                  name
                  mime
                  url
                }
              }
            }
          }
        `,
        variables: {
          file: null,
        },
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          data: {
            id: expect.anything(),
            attributes: {
              name: 'rec.pdf',
              mime: 'application/pdf',
              url: expect.any(String),
            },
          },
        },
      },
    });

    data.file = res.body.data.upload.data;
  });

  test('Upload multiple pdf', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFiles($files: [Upload]!) {
            multipleUpload(files: $files) {
              data {
                id
                attributes {
                  name
                  mime
                  url
                }
              }
            }
          }
        `,
        variables: {
          files: [null, null],
        },
      }),
      map: JSON.stringify({
        nFile0: ['variables.files.0'],
        nFile1: ['variables.files.1'],
      }),
      nFile0: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.multipleUpload).toHaveLength(2);
    expect(res.body).toEqual({
      data: {
        multipleUpload: expect.arrayContaining([
          expect.objectContaining({
            data: {
              id: expect.anything(),
              attributes: {
                name: 'rec.pdf',
                mime: 'application/pdf',
                url: expect.any(String),
              },
            },
          }),
        ]),
      },
    });
  });

  test('Update file information', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation updateFileInfo($id: ID!, $info: FileInfoInput!) {
            updateFileInfo(id: $id, info: $info) {
              data {
                id
                attributes {
                  name
                  alternativeText
                  caption
                }
              }
            }
          }
        `,
        variables: {
          id: data.file.id,
          info: {
            name: 'test name',
            alternativeText: 'alternative text test',
            caption: 'caption test',
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        updateFileInfo: {
          data: {
            id: data.file.id,
            attributes: {
              name: 'test name',
              alternativeText: 'alternative text test',
              caption: 'caption test',
            },
          },
        },
      },
    });
  });

  test('Delete a file', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation removeFile($id: ID!) {
            removeFile(id: $id) {
              data {
                id
              }
            }
          }
        `,
        variables: {
          id: data.file.id,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        removeFile: {
          data: {
            id: data.file.id,
          },
        },
      },
    });
  });

  test('Delete a file that does not exist', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation removeFile($id: ID!) {
            removeFile(id: $id) {
              data {
                id
              }
            }
          }
        `,
        variables: {
          id: '404',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        removeFile: null,
      },
    });
  });

  test('Upload a single image with info', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFilesWithInfo($file: Upload!, $info: FileInfoInput) {
            upload(file: $file, info: $info) {
              data {
                id
                attributes {
                  name
                  alternativeText
                  caption
                }
              }
            }
          }
        `,
        variables: {
          file: null,
          info: {
            alternativeText: 'alternative text test',
            caption: 'caption test',
          },
        },
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          data: {
            id: expect.anything(),
            attributes: {
              name: 'rec.jpg',
              alternativeText: 'alternative text test',
              caption: 'caption test',
            },
          },
        },
      },
    });
  });

  test('Upload a single pdf with info', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFilesWithInfo($file: Upload!, $info: FileInfoInput) {
            upload(file: $file, info: $info) {
              data {
                id
                attributes {
                  name
                  alternativeText
                  caption
                }
              }
            }
          }
        `,
        variables: {
          file: null,
          info: {
            alternativeText: 'alternative text test',
            caption: 'caption test',
          },
        },
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          data: {
            id: expect.anything(),
            attributes: {
              name: 'rec.pdf',
              alternativeText: 'alternative text test',
              caption: 'caption test',
            },
          },
        },
      },
    });
  });
});
