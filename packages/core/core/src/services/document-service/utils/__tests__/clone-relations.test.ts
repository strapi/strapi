import { prepareCloneData } from '../clone-relations';

const blockComponent = {
  uid: 'basic.block',
  modelType: 'component',
  attributes: {
    image: { type: 'media', multiple: false },
  },
} as any;

const contentType = {
  uid: 'api::article.article',
  modelType: 'contentType',
  attributes: {
    cover: { type: 'media', multiple: false },
    block: { type: 'component', component: 'basic.block', repeatable: false },
  },
} as any;

const getModel = (uid: string) => (uid === 'basic.block' ? blockComponent : contentType);

describe('clone-relations', () => {
  describe('prepareCloneData', () => {
    it('should replace the original media with a submitted media operation payload', async () => {
      const { data } = await prepareCloneData(
        { cover: { id: 1, documentId: 'file-a' } },
        { cover: { set: [{ documentId: 'file-b' }] } },
        contentType,
        getModel
      );

      expect(data.cover).toEqual({ set: [{ documentId: 'file-b' }] });
    });

    it('should replace the original media of a component with a submitted media operation payload', async () => {
      const { data } = await prepareCloneData(
        { block: { id: 3, image: { id: 1, documentId: 'file-a' } } },
        { block: { image: { connect: [{ documentId: 'file-b' }] } } },
        contentType,
        getModel
      );

      expect(data.block).toEqual({ id: 3, image: { connect: [{ documentId: 'file-b' }] } });
    });
  });
});
