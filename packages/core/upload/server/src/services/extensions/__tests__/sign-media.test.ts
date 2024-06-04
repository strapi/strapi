import { signEntityMedia } from '../utils';
import { getService } from '../../../utils';

jest.mock('../../../utils');

describe('Upload | extensions | entity-manager', () => {
  const modelUID = 'model';
  const componentUID = 'component';

  const models = {
    [modelUID]: {
      attributes: {
        media: {
          type: 'media',
          multiple: false,
        },
        media_repeatable: {
          type: 'media',
          multiple: true,
        },
        compo_media_repeatable: {
          type: 'component',
          repeatable: true,
          component: componentUID,
        },
        compo_media: {
          type: 'component',
          component: componentUID,
        },
        dynamicZone: {
          type: 'dynamiczone',
          components: [componentUID],
        },
      },
    },
    [componentUID]: {
      attributes: {
        media_repeatable: {
          type: 'media',
          multiple: true,
        },
        media: {
          type: 'media',
          multiple: false,
        },
      },
    },
  } as const;

  const media = ['media', 'media_1'].map((entry) => ({
    formats: {
      thumbnail: {
        url: `${entry}_thumb`,
      },
      large: {
        url: `${entry}_large`,
      },
      small: {
        url: `${entry}_small`,
      },
      medium: {
        url: `${entry}_medium`,
      },
    },
    url: `${entry}_url`,
  }));

  describe('signEntityMedia', () => {
    let spySignFileUrls: any;
    beforeEach(() => {
      spySignFileUrls = jest.fn();
      jest.mocked(getService).mockImplementation(() => ({
        signFileUrls: spySignFileUrls,
      }));

      global.strapi = {
        plugins: {
          upload: {},
        },
        getModel: jest.fn((uid: keyof typeof models) => models[uid]),
      } as any;
    });

    test('makes correct calls for media attribute', async () => {
      const entity = {
        media: media[0],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledWith(entity.media);
    });

    test('makes correct calls for repeatable media', async () => {
      const entity = {
        media_repeatable: media,
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(2);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for components', async () => {
      const entity = {
        compo_media: {
          media: media[0],
          media_repeatable: media,
        },
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(3);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for repeatable components', async () => {
      const entity = {
        compo_media_repeatable: [
          {
            media: media[0],
            media_repeatable: media,
          },
          {
            media: media[1],
            media_repeatable: media,
          },
        ],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(6);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for dynamic zones', async () => {
      const entity = {
        dynamicZone: [
          {
            __component: componentUID,
            media_repeatable: media,
            media: media[1],
          },
        ],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(3);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });
  });
});
