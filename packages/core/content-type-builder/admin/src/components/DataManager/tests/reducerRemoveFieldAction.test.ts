import { reducer, actions } from '../reducer';

import { initCT, initCompo, init } from './utils';

describe('CTB | components | DataManagerProvider | reducer | REMOVE_FIELD', () => {
  describe('Removing a field that is not a relation', () => {
    it('Should remove the attribute correctly from the content type', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          { name: 'city', type: 'string', required: true },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'city',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
          {
            name: 'city',
            type: 'string',
            required: true,
            status: 'REMOVED',
          },
        ],
      });
    });

    it('Should remove the attribute correctly from the component', () => {
      const component = initCompo('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          { name: 'city', type: 'string', required: true },
        ],
      });

      const initializedState = init({
        components: {
          [component.uid]: component,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'city',
        forTarget: 'component',
        targetUid: component.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.components[component.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
          {
            name: 'city',
            type: 'string',
            required: true,
            status: 'REMOVED',
          },
        ],
      });
    });
  });

  describe('Removing a relation attribute with another content type', () => {
    it('Should remove the attribute correctly if the relation is made with another content type', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          {
            name: 'city',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::city.city',
            targetAttribute: 'address',
          },
        ],
      });

      const cityContentType = initCT('city', {
        attributes: [
          { name: 'name', type: 'string', required: true },
          {
            name: 'address',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'city',
          },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
          [cityContentType.uid]: cityContentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'city',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
          {
            name: 'city',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::city.city',
            targetAttribute: 'address',
            status: 'REMOVED',
          },
        ],
      });

      expect(state.current.contentTypes[cityContentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          { name: 'name', type: 'string', required: true },
          {
            name: 'address',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'city',
            status: 'REMOVED',
          },
        ],
      });
    });
  });

  describe('Removing a relation attribute with the same content type', () => {
    it('Should handle the removal of the one side (oneWay or manyWay) nature correctly', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          {
            name: 'parent',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'child',
          },
          {
            name: 'child',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'parent',
          },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'child',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
          {
            name: 'parent',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'child',
            status: 'REMOVED',
          },
          {
            name: 'child',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'parent',
            status: 'REMOVED',
          },
        ],
      });
    });

    it('Removes a new field entirely from the content type', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          {
            name: 'parent',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            status: 'NEW',
          },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'parent',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
        ],
      });
    });

    it('Removes a reverse relation field (NEW) entirely from the content type', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          {
            name: 'child',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'parent',
            status: 'NEW',
          },
          {
            name: 'parent',
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: 'child',
            status: 'NEW',
          },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'child',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
        ],
      });
    });
  });

  describe('Removing a field that is targeted by a UID field', () => {
    it('Should remove the attribute correctly and remove the targetField from the UID field', () => {
      const contentType = initCT('address', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          { name: 'city', type: 'string', required: true },
          { name: 'slug', type: 'uid', required: true, targetField: 'city' },
        ],
      });

      const initializedState = init({
        contentTypes: {
          [contentType.uid]: contentType,
        },
      });

      const action = actions.removeField({
        attributeToRemoveName: 'city',
        forTarget: 'contentType',
        targetUid: contentType.uid,
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'geolocation',
            type: 'json',
            required: true,
          },
          {
            name: 'city',
            type: 'string',
            required: true,
            status: 'REMOVED',
          },
          {
            name: 'slug',
            type: 'uid',
            required: true,
          },
        ],
      });
    });
  });
});
