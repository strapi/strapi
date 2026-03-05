'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
const data = { dogs: [] };
let strapi;
let rq;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
    relatedMedia: {
      type: 'media',
      multiple: true,
    },
  },
};

const todoListModel = {
  displayName: 'TodoList',
  singularName: 'todolist',
  pluralName: 'todolists',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
    todo: {
      displayName: 'todo',
      type: 'component',
      repeatable: true,
      component: 'default.todo',
    },
  },
};

const todoComponent = {
  displayName: 'Todo',
  attributes: {
    docs: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: true,
    },
    task: {
      type: 'string',
    },
  },
};

describe('Upload plugin', () => {
  beforeAll(async () => {
    await builder
      .addContentType(dogModel)
      .addComponent(todoComponent)
      .addContentType(todoListModel)
      .build();
    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('Simple image upload', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'rec.jpg',
          ext: '.jpg',
          mime: 'image/jpeg',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
        })
      );
    });

    test('Rejects when no files are provided', async () => {
      const res = await rq({ method: 'POST', url: '/upload', formData: {} });
      expect(res.statusCode).toBe(400);
    });

    test('Generates a thumbnail on large enough files', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/thumbnail_target.png')),
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'thumbnail_target.png',
          ext: '.png',
          mime: 'image/png',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          formats: {
            thumbnail: {
              name: 'thumbnail_thumbnail_target.png',
              hash: expect.any(String),
              ext: '.png',
              mime: 'image/png',
              size: expect.any(Number),
              sizeInBytes: expect.any(Number),
              width: expect.any(Number),
              height: expect.any(Number),
              url: expect.any(String),
              path: null,
            },
          },
        })
      );
    });
  });

  describe('Read', () => {
    test('Get files', async () => {
      const getRes = await rq({ method: 'GET', url: '/upload/files' });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            url: expect.any(String),
          }),
        ])
      );
    });

    test('Get one file', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/thumbnail_target.png')),
        },
      });

      const dogEntity = await strapi.db.query('api::dog.dog').create({
        data: {
          profilePicture: res.body[0].id,
        },
        populate: {
          profilePicture: true,
        },
      });

      const getRes = await rq({
        method: 'GET',
        url: `/upload/files/${dogEntity.profilePicture.id}`,
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          url: expect.any(String),
        })
      );

      await strapi.db.query('api::dog.dog').delete({ where: { id: dogEntity.id } });
      await strapi.db
        .query('plugin::upload.file')
        .delete({ where: { id: dogEntity.profilePicture.id } });
    });
  });

  describe('Filtering data based on media attributes', () => {
    let uploadRes;
    let dogRes;

    beforeAll(async () => {
      await Promise.all(
        data.dogs.map((dog) => {
          return strapi.entityService.delete('api::dog.dog', dog.data.id);
        })
      );

      uploadRes = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          fileInfo: JSON.stringify({
            alternativeText: 'rec',
            caption: 'my caption',
          }),
        },
      });

      dogRes = await rq({
        method: 'POST',
        url: '/dogs',
        body: {
          data: {
            profilePicture: {
              id: uploadRes.body[0].id,
            },
          },
        },
      });
    });

    afterAll(async () => {
      await rq({
        method: 'DELETE',
        url: `/dogs/${dogRes.body.data.id}`,
      });

      await rq({
        method: 'DELETE',
        url: `/upload/files/${uploadRes.body[0].id}`,
      });
    });

    test('can filter on notNull', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $notNull: true },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $notNull: false },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter on null', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $null: true },
          },
        },
      });

      expect(res.body.data.length).toBe(0);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $null: false },
          },
        },
      });

      expect(res.body.data.length).toBe(1);
    });

    test('can filter on id', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: uploadRes.body[0].id,
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: 999999999,
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter media attribute', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { ext: '.jpg' },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { ext: '.pdf' },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter media attribute with operators', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: {
              caption: {
                $contains: 'my',
              },
            },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: {
              caption: {
                $contains: 'not',
              },
            },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    describe('Media relations', () => {
      test('connect works', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with just the first image
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // connect the second image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                connect: [imageIds[1]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        expect(connectRes.body.data.relatedMedia).toHaveLength(2);

        expect(connectRes.body.data.relatedMedia).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: imageIds[0] }),
            expect.objectContaining({ id: imageIds[1] }),
          ])
        );
      });

      test('disconnect works', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with both images
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0], imageIds[1]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // disconnect the first image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                disconnect: [imageIds[0]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        expect(connectRes.body.data.relatedMedia).toHaveLength(1);

        expect(connectRes.body.data.relatedMedia[0]).toEqual(
          expect.objectContaining({
            id: imageIds[1],
          })
        );
      });

      test('set works', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with just the first image
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // connect the second image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                set: [imageIds[0], imageIds[1]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        expect(connectRes.body.data.relatedMedia).toHaveLength(2);
        expect(connectRes.body.data.relatedMedia[0]).toEqual(
          expect.objectContaining({
            id: images.body[0].id,
          })
        );
        expect(connectRes.body.data.relatedMedia[1]).toEqual(
          expect.objectContaining({
            id: images.body[1].id,
          })
        );
      });
    });
  });

  describe('File restriction', () => {
    afterEach(() => {
      strapi.config.set('plugin::upload.security', {});
    });

    /**
     * These tests prove that MIME type is detected from file content and used for
     * allow/deny and for the stored file.mime. "rejects when content is detectable
     * but not in allow list" would pass without detection (declared/extension would
     * allow); it only rejects because detection runs and finds image/jpeg. "stored
     * mime is detected type for PDF" proves the saved file gets the detected MIME.
     */
    describe('MIME type detection (content-based)', () => {
      const utilsPath = (name) => path.join(__dirname, '../utils', name);

      test('stored mime is detected type for PDF when declared type is generic', async () => {
        strapi.config.set('plugin::upload.security', { allowedTypes: ['application/pdf'] });
        const res = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: {
              path: utilsPath('rec.pdf'),
              filename: 'document.pdf',
              contentType: 'application/octet-stream',
            },
          },
        });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].mime).toBe('application/pdf');
        await rq({ method: 'DELETE', url: `/upload/files/${res.body[0].id}` });
      });

      test('stored mime is detected type for JPEG when filename has no extension and Content-Type is generic', async () => {
        strapi.config.set('plugin::upload.security', { allowedTypes: ['image/jpeg'] });
        const res = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: {
              path: utilsPath('rec.jpg'),
              filename: 'data',
              contentType: 'application/octet-stream',
            },
          },
        });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].mime).toBe('image/jpeg');
        await rq({ method: 'DELETE', url: `/upload/files/${res.body[0].id}` });
      });

      test('stored mime is detected type for docx when no config and Content-Type is application/octet-stream', async () => {
        strapi.config.set('plugin::upload.security', {});
        const res = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: {
              path: utilsPath('rec.docx'),
              filename: 'document.docx',
              contentType: 'application/octet-stream',
            },
          },
        });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].mime).toBe(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        await rq({ method: 'DELETE', url: `/upload/files/${res.body[0].id}` });
      });

      test('rejects when content is detectable but not in allow list (extension/declared would allow)', async () => {
        strapi.config.set('plugin::upload.security', { allowedTypes: ['application/pdf'] });
        // Real JPEG content sent as fake.pdf – only content detection reveals image/jpeg, so we reject.
        const res = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: {
              path: utilsPath('rec.jpg'),
              filename: 'fake.pdf',
              contentType: 'application/pdf',
            },
          },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code || res.body.error.message).toBeTruthy();
      });

      describe('no-config vs with-config: same validation path, same stored mime', () => {
        test('stored mime for docx (Content-Type octet-stream) is the same with empty config and with allowedTypes', async () => {
          const formData = {
            files: {
              path: utilsPath('rec.docx'),
              filename: 'document.docx',
              contentType: 'application/octet-stream',
            },
          };
          const docxMime =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

          strapi.config.set('plugin::upload.security', {});
          const resNoConfig = await rq({
            method: 'POST',
            url: '/upload',
            formData: { ...formData },
          });
          expect(resNoConfig.statusCode).toBe(201);
          expect(resNoConfig.body).toHaveLength(1);
          const mimeNoConfig = resNoConfig.body[0].mime;
          expect(mimeNoConfig).toBe(docxMime);
          await rq({ method: 'DELETE', url: `/upload/files/${resNoConfig.body[0].id}` });

          strapi.config.set('plugin::upload.security', {
            allowedTypes: ['application/*'],
          });
          const resWithConfig = await rq({
            method: 'POST',
            url: '/upload',
            formData: { ...formData },
          });
          expect(resWithConfig.statusCode).toBe(201);
          expect(resWithConfig.body).toHaveLength(1);
          const mimeWithConfig = resWithConfig.body[0].mime;
          expect(mimeWithConfig).toBe(docxMime);
          expect(mimeWithConfig).toBe(mimeNoConfig);
          await rq({ method: 'DELETE', url: `/upload/files/${resWithConfig.body[0].id}` });
        });

        test('stored mime for PDF (Content-Type octet-stream) is the same with empty config and with allowedTypes', async () => {
          const formData = {
            files: {
              path: utilsPath('rec.pdf'),
              filename: 'document.pdf',
              contentType: 'application/octet-stream',
            },
          };
          const pdfMime = 'application/pdf';

          strapi.config.set('plugin::upload.security', {});
          const resNoConfig = await rq({
            method: 'POST',
            url: '/upload',
            formData: { ...formData },
          });
          expect(resNoConfig.statusCode).toBe(201);
          expect(resNoConfig.body).toHaveLength(1);
          const mimeNoConfig = resNoConfig.body[0].mime;
          expect(mimeNoConfig).toBe(pdfMime);
          await rq({ method: 'DELETE', url: `/upload/files/${resNoConfig.body[0].id}` });

          strapi.config.set('plugin::upload.security', {
            allowedTypes: ['application/pdf'],
          });
          const resWithConfig = await rq({
            method: 'POST',
            url: '/upload',
            formData: { ...formData },
          });
          expect(resWithConfig.statusCode).toBe(201);
          expect(resWithConfig.body).toHaveLength(1);
          const mimeWithConfig = resWithConfig.body[0].mime;
          expect(mimeWithConfig).toBe(pdfMime);
          expect(mimeWithConfig).toBe(mimeNoConfig);
          await rq({ method: 'DELETE', url: `/upload/files/${resWithConfig.body[0].id}` });
        });
      });
    });

    describe('validation matrix (real detection)', () => {
      const utilsPath = (name) => path.join(__dirname, '../utils', name);

      const fixturePaths = {
        jpg: utilsPath('rec.jpg'),
        png: utilsPath('strapi.png'),
        pdf: utilsPath('rec.pdf'),
        docx: utilsPath('rec.docx'),
        txt: utilsPath('rec.txt'),
        unknown: utilsPath('rec.bin'),
      };

      const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      // allowedList: undefined = allow all; [] = allow none; string[] = allow only these.
      const MATRIX = [
        {
          description: 'declared in deny → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'allow+deny: declared in ban → reject',
          allowedList: ['image/jpeg', 'image/png'],
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'extension MIME in deny → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'allow+deny: extension in ban → reject',
          allowedList: ['image/*'],
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'declared=ext=detected, in allow → allow',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'allow',
        },
        {
          description: 'declared=ext=detected (PNG), in allow → allow',
          allowedList: ['image/png', 'image/jpeg'],
          bannedList: [],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'allow',
        },
        {
          description: 'declared=ext=detected but not in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'docx declared=ext=detected, in allow → allow',
          allowedList: [DOCX_MIME],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: DOCX_MIME,
          expectedResult: 'allow',
        },
        {
          description: 'detected in deny, declared≠detected (.jpg name, PNG content) → reject',
          allowedList: ['image/jpeg'],
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'detected in deny (declared=ext=detected=png, deny png) → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'no extension, detected in allow, declared generic → allow',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'data',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'no extension, detected in allow (allow all) → allow',
          allowedList: undefined,
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'data',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'no extension, detected not in allow → reject',
          allowedList: ['application/pdf'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'data',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'detected matches extension, declared generic → allow',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'detected in allow, extension mismatch (warn but allow)',
          allowedList: ['image/jpeg', 'application/pdf'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'application/pdf',
          expectedResult: 'allow',
        },
        {
          description: 'detected not in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'pdf',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'application/pdf',
          expectedResult: 'reject',
        },
        {
          description: 'explicit empty allow list + detectable → reject',
          allowedList: [],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, extension in allow, declared matches extension → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable, extension in allow, declared generic → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable, extension in allow, declared empty → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: '',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable, extension not in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, extension in allow (extension type used) → allow',
          allowedList: ['text/plain', 'application/pdf'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'allow',
        },
        {
          description: 'explicit empty allow + undetectable with extension → reject',
          allowedList: [],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'no config (allow all), undetectable, declared generic → allow',
          allowedList: undefined,
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'deny only, type not in deny → allow',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable unknown ext, declared in allow but no ext MIME → reject',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable unknown ext, declared not in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension, declared generic → reject',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension, declared specific → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension, declared in allow (declared type used) → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable unknown ext, declared generic → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'file.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'docx detected, application/* in allow → allow',
          allowedList: ['application/*'],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: DOCX_MIME,
          expectedResult: 'allow',
        },
        {
          description: 'docx detected, declared generic → allow',
          allowedList: [DOCX_MIME],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
      ];

      for (const row of MATRIX) {
        test(row.description, async () => {
          const config = {
            ...(row.allowedList !== undefined && { allowedTypes: row.allowedList }),
            ...(row.bannedList.length > 0 && { deniedTypes: row.bannedList }),
          };
          strapi.config.set('plugin::upload.security', config);

          const res = await rq({
            method: 'POST',
            url: '/upload',
            formData: {
              files: {
                path: fixturePaths[row.contentKind],
                filename: row.uploadedFileName,
                contentType: row.uploadedFileDeclaredType,
              },
            },
          });

          if (row.expectedResult === 'allow') {
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveLength(1);
            await rq({ method: 'DELETE', url: `/upload/files/${res.body[0].id}` });
          } else {
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code || res.body.error.message).toBeTruthy();
          }
        });
      }
    });
  });
});
