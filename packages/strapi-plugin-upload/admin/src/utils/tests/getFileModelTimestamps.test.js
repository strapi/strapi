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
          schema: {
            attributes: {},
            options: {
              timestamps: ['createdAt', 'updatedAt'],
            },
          },
        },
      },
    };

    const expected = ['createdAt', 'updatedAt'];

    expect(getFileModelTimestamps(plugins)).toEqual(expected);
  });

  it('should return the default timestamps', () => {
    const plugins = null;

    const expected = ['created_at', 'updated_at'];

    expect(getFileModelTimestamps(plugins)).toEqual(expected);
  });
});
