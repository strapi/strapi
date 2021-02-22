import getFileModelTimestamps from '../getFileModelTimestamps';

describe('UPLOAD | utils | getFileModelTimestamps', () => {
  it('should retrieve the timestamps of the model file from the plugins object', () => {
    const plugins = {
      ctb: {
        ok: true,
      },
      upload: {
        ok: true,
        fileModel: {
          uid: 'plugins::upload.file',
          attributes: {},
          options: {
            timestamps: ['createdAt', 'updatedAt'],
          },
        },
      },
    };

    const expected = ['createdAt', 'updatedAt'];

    expect(getFileModelTimestamps(plugins)).toEqual(expected);
  });

  it('should throw an error on empty model configuration', () => {
    const plugins = null;
    expect(() => getFileModelTimestamps(plugins)).toThrowError();
  });

  it('should throw an error on invalid timestamp configuration', () => {
    const plugins = {
      ctb: {
        ok: true,
      },
      upload: {
        ok: true,
        fileModel: {
          uid: 'plugins::upload.file',
          attributes: {},
          options: {
            timestamps: true,
          },
        },
      },
    };

    expect(() => getFileModelTimestamps(plugins)).toThrowError();
  });
});
