'use strict';

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
    age: {
      type: 'integer',
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

  const createCollector = async collector => {
    const res = await rq({
      method: 'POST',
      url: '/collectors',
      body: collector,
    });
    data.collectors.push(res.body);
  };

  await createCollector({
    name: 'Bernard',
    age: 25,
    panini_cards: [data.paniniCards[0].id, data.paniniCards[1].id],
  });
  await createCollector({
    name: 'Isabelle',
    age: 55,
    panini_cards: [data.paniniCards[0].id],
    collector_friends: [data.collectors[0].id],
  });
  await createCollector({
    name: 'Kenza',
    age: 25,
    panini_cards: [],
    collector_friends: [data.collectors[0].id],
  });
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

  describe('Without search', () => {
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
      test('Should return 2 results', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            'collector_friends.name': data.collectors[0].name,
          },
        });

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
        expect(res.body).toMatchObject(data.collectors.slice(1, 3));
      });
    });
  });
  describe('With search', () => {
    describe('Filter on a manyWay relation', () => {
      test('panini_cards.name + empty search', async () => {
        const res = await rq({
          method: 'GET',
          url: '/content-manager/explorer/application::collector.collector',
          qs: {
            'panini_cards.name': data.paniniCards[0].name,
            _q: '',
          },
        });

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
        expect(res.body).toMatchObject(data.collectors.slice(0, 2));
      });

      test('panini_cards.name + _q=25', async () => {
        const res = await rq({
          method: 'GET',
          url: '/content-manager/explorer/application::collector.collector',
          qs: {
            'panini_cards.name': data.paniniCards[0].name,
            _q: 25,
          },
        });

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body).toMatchObject([data.collectors[0]]);
      });
    });

    describe('Filter on a self manyWay relation', () => {
      test('collector_friends.name + empty search', async () => {
        const res = await rq({
          method: 'GET',
          url: '/content-manager/explorer/application::collector.collector',
          qs: {
            'collector_friends.name': data.collectors[0].name,
            _q: '',
          },
        });

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
        expect(res.body).toMatchObject(data.collectors.slice(1, 3));
      });
      test('collector_friends.name + search isa', async () => {
        const res = await rq({
          method: 'GET',
          url: '/content-manager/explorer/application::collector.collector',
          qs: {
            'collector_friends.name': data.collectors[0].name,
            _q: 'isa',
          },
        });

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body).toMatchObject([data.collectors[1]]);
      });
    });
  });
});
