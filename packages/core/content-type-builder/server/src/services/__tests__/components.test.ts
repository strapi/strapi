import { createComponent, deleteComponent, editComponent } from '../components';
import { collectUnhandledRejections } from './unhandled-rejections';

const builder = {
  createNewComponentUIDMap: jest.fn(() => ({})),
  createComponent: jest.fn((component) => component),
  editComponent: jest.fn((component) => component),
  deleteComponent: jest.fn((uid) => ({ uid })),
  writeFiles: jest.fn().mockResolvedValue(true),
};

jest.mock('../schema-builder', () => jest.fn(() => builder));

const component = {
  category: 'default',
  displayName: 'Hero',
  attributes: {},
};

describe('Content Type Builder - Components service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
    } as any;
  });

  it('logs a failing event listener instead of leaving an unhandled rejection', async () => {
    // A user listener that throws makes the event hub emit reject
    jest.mocked(strapi.eventHub.emit).mockRejectedValue(new Error('listener failed'));

    const rejections = await collectUnhandledRejections(async () => {
      await createComponent({ component });
      await editComponent('default.hero', { component: component as any });
      await deleteComponent('default.hero');
    });

    expect(rejections).toEqual([]);
    expect(strapi.eventHub.emit).toHaveBeenCalledTimes(3);
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.create listener failed: listener failed'
    );
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.update listener failed: listener failed'
    );
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.delete listener failed: listener failed'
    );
  });
});
