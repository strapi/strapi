// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  paniniCards: [],
  collectors: [],
};

const paniniCard = {
  name: 'paniniCard',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const collector = {
  name: 'collector',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    panini_cards: {
      nature: 'manyWay',
      target: 'application::panini-card.panini-card',
      unique: false,
    },
    collector_friends: {
      nature: 'manyWay',
      target: '__self__',
      unique: false,
    },
  },
};

const paniniCardFixtures = [
  {
    name: 'Hugo LLORIS',
  },
  {
    name: 'Samuel UMTITI',
  },
];

async function createFixtures() {
  for (let paniniCard of paniniCardFixtures) {
    const res = await rq({
      method: 'POST',
      url: '/panini-cards',
      body: paniniCard,
    });

    data.paniniCards.push(res.body);
  }

  const collector1Res = await rq({
    method: 'POST',
    url: '/collectors',
    body: {
      name: 'Bernard',
      panini_cards: [data.paniniCards[0].id, data.paniniCards[1].id],
    },
  });
  data.collectors.push(collector1Res.body);

  const collector2Res = await rq({
    method: 'POST',
    url: '/collectors',
    body: {
      name: 'Isabelle',
      panini_cards: [data.paniniCards[0].id],
      collector_friends: [data.collectors[0].id],
    },
  });
  data.collectors.push(collector2Res.body);
}

async function deleteFixtures() {
  for (let paniniCard of data.paniniCards) {
    await rq({
      method: 'DELETE',
      url: `/panini-cards/${paniniCard.id}`,
    });
  }
  for (let collector of data.collectors) {
    await rq({
      method: 'DELETE',
      url: `/collectors/${collector.id}`,
    });
  }
}

describe('Deep Filtering API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createContentTypes([paniniCard, collector]);
    await createFixtures();
  }, 60000);

  afterAll(async () => {
    await deleteFixtures();
    await modelsUtils.deleteContentTypes(['collector', 'panini-card']);
  }, 60000);

  describe('Filter on a manyWay relation', () => {
    test('Should return 2 results', async () => {
      const res = await rq({
        method: 'GET',
        url: '/collectors',
        qs: {
          'panini_cards.name': data.paniniCards[0].name,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toMatchObject(data.collectors[0]);
      expect(res.body[1]).toMatchObject(data.collectors[1]);
    });

    test('Should return 1 result', async () => {
      const res = await rq({
        method: 'GET',
        url: '/collectors',
        qs: {
          'panini_cards.name': data.paniniCards[1].name,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.collectors[0]);
    });
  });

  describe('Filter on a self manyWay relation', () => {
    test('Should return 1 result', async () => {
      const res = await rq({
        method: 'GET',
        url: '/collectors',
        qs: {
          'collector_friends.name': data.collectors[0].name,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.collectors[1]);
    });
  });
});
