import { reducer, actions } from '../reducer';

import { initCT, initCompo, init } from './utils';

describe('CTB | components | DataManagerProvider | reducer | EDIT_ATTRIBUTE', () => {
  describe('Editing a common attribute (string, integer, json, media, ...)', () => {
    it('Should edit the attribute correctly and preserve the order of the attributes for a content type', () => {
      const contentType = initCT('test', {
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          { name: 'cover', type: 'media', multiple: false, required: false },
          {
            name: 'category',
            relation: 'oneToOne',
            target: 'api::category.category',
            type: 'relation',
          },
        ],
      });

      const initializedState = init({
        contentTypes: { [contentType.uid]: contentType },
      });

      const action = actions.editAttribute({
        attributeToSet: {
          type: 'media',
          multiple: true,
          required: false,
          name: 'covers',
        },
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        name: 'cover',
      });

      const state = reducer(initializedState, action);

      expect(state.current.contentTypes[contentType.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          { name: 'geolocation', type: 'json', required: true },
          { name: 'covers', type: 'media', multiple: true, required: false },
          {
            name: 'category',
            relation: 'oneToOne',
            target: 'api::category.category',
            type: 'relation',
          },
        ],
      });
    });

    it('Should edit the attribute correctly and preserve the order of the attributes for a component inside the content type view', () => {
      const component = initCompo('dish', {
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'My super dish',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'price',
            type: 'float',
          },
        ],
      });

      const contentType = initCT('address', {
        attributes: [
          {
            name: 'dishes',
            component: component.uid,
            type: 'component',
            repeatable: true,
          },
          {
            name: 'category',
            relation: 'oneToOne',
            target: 'api::category.category',
            type: 'relation',
          },
        ],
      });

      const initializedState = init({
        contentTypes: { [contentType.uid]: contentType },
        components: { [component.uid]: component },
      });

      const action = actions.editAttribute({
        attributeToSet: {
          type: 'text',
          required: true,
          name: 'test',
        },
        forTarget: 'component',
        targetUid: component.uid,
        name: 'description',
      });

      const state = reducer(initializedState, action);

      expect(state.current.components[component.uid]).toMatchObject({
        status: 'CHANGED',
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'My super dish',
          },
          {
            name: 'test',
            type: 'text',
            required: true,
          },
          {
            name: 'price',
            type: 'float',
          },
        ],
      });
    });
  });

  describe('Editing a relation attribute', () => {
    describe('Editing a relation with the same content type', () => {
      describe('Changing the nature of the relation', () => {
        it('Should handle changing the nature from a one side relation (oneWay or manyWay) to another one side relation correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'api::address.address';
          const contentType = initCT('address', {
            attributes: [
              { name: 'geolocation', type: 'json', required: true },
              { name: 'city', type: 'string', required: true },
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way',
                relation: 'oneToOne',
                targetAttribute: null,
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });

          const initializedState = init({
            contentTypes: { [contentType.uid]: contentType },
          });

          const state = reducer(
            initializedState,
            actions.editAttribute({
              attributeToSet: {
                relation: 'oneToMany',
                targetAttribute: null,
                target: contentType.uid,
                type: 'relation',
                name: 'many_ways',
              },
              forTarget: 'contentType',
              targetUid: contentType.uid,
              name: 'one_way',
            })
          );

          expect(state.current.contentTypes[contentType.uid]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'geolocation', type: 'json', required: true },
              { name: 'city', type: 'string', required: true },
              { name: 'postal_code', type: 'string' },
              {
                name: 'many_ways',
                relation: 'oneToMany',
                target: contentTypeUID,
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });
        });

        it('Should handle changing the nature from a one side relation (oneWay or manyWay) to a many sides (oneToOne, ...) correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'api::address.address';
          const contentType = initCT('address', {
            attributes: [
              { name: 'geolocation', type: 'json', required: true },
              { name: 'city', type: 'string', required: true },
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way',
                relation: 'oneToOne',
                targetAttribute: null,
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
            ],
          });

          const initializedState = init({
            contentTypes: { [contentType.uid]: contentType },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'oneToOne',
              targetAttribute: 'address',
              target: contentType.uid,
              type: 'relation',
              name: 'one_way',
            },
            forTarget: 'contentType',
            targetUid: contentType.uid,
            name: 'one_way',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentType.uid]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'geolocation', type: 'json', required: true },
              { name: 'city', type: 'string', required: true },
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way',
                relation: 'oneToOne',
                target: contentType.uid,
                targetAttribute: 'address',
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
              {
                name: 'address',
                relation: 'oneToOne',
                target: contentType.uid,
                targetAttribute: 'one_way',
                type: 'relation',
              },
            ],
          });
        });

        it('Should handle changing the nature from a many side relation to a one side relation correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'api::address.address';
          const contentType = initCT('address', {
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'left',
                relation: 'oneToOne',
                targetAttribute: 'right',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'right',
                relation: 'oneToOne',
                target: contentTypeUID,
                targetAttribute: 'left',
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });

          const initializedState = init({
            contentTypes: { [contentType.uid]: contentType },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'oneToOne',
              targetAttribute: null,
              target: contentType.uid,
              type: 'relation',
              name: 'one_way',
            },
            forTarget: 'contentType',
            targetUid: contentType.uid,
            name: 'left',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentType.uid]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way',
                relation: 'oneToOne',
                target: contentType.uid,
                targetAttribute: null,
                type: 'relation',
                status: 'CHANGED',
              },
              {
                name: 'right',
                relation: 'oneToOne',
                target: contentTypeUID,
                targetAttribute: 'left',
                type: 'relation',
                status: 'REMOVED',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });
        });
      });

      describe('Changing the target of the relation', () => {
        it('Should handle the edition of the target correctly for a one way relation (oneWay, manyWay) with another content type and preserve the order of the attributes', () => {
          const contentTypeUID = 'api::address.address';
          const updatedTargetUID = 'api::category.category';
          const addressContentType = initCT('address', {
            attributes: [
              {
                name: 'address',
                relation: 'oneToOne',
                targetAttribute: null,
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
            ],
          });

          const categoryContentType = initCT('category', {
            attributes: [
              { name: 'name', type: 'string', required: true },
              { name: 'description', type: 'text' },
            ],
          });

          const initializedState = init({
            contentTypes: {
              [contentTypeUID]: addressContentType,
              [updatedTargetUID]: categoryContentType,
            },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'oneToOne',
              targetAttribute: null,
              target: updatedTargetUID,
              type: 'relation',
              name: 'one_way',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            name: 'address',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              {
                name: 'one_way',
                relation: 'oneToOne',
                targetAttribute: null,
                target: updatedTargetUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
            ],
          });
        });

        it('Should remove the opposite attribute and keep the order of the attributes if the relation nature is not a one side', () => {
          const contentTypeUID = 'api::address.address';
          const updatedTargetUID = 'api::category.category';
          const addressContentType = initCT('address', {
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'many_to_many_left',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_right',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'many_to_many_right',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_left',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });

          const categoryContentType = initCT('category', {
            attributes: [
              { name: 'name', type: 'string', required: true },
              { name: 'description', type: 'text' },
            ],
          });

          const initializedState = init({
            contentTypes: {
              [contentTypeUID]: addressContentType,
              [updatedTargetUID]: categoryContentType,
            },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'manyToMany',
              target: updatedTargetUID,
              type: 'relation',
              name: 'many_to_many_left',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            name: 'many_to_many_left',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'many_to_many_left',
                relation: 'manyToMany',
                target: updatedTargetUID,
                type: 'relation',
                status: 'CHANGED',
              },
              {
                name: 'many_to_many_right',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_left',
                target: contentTypeUID,
                type: 'relation',
                status: 'REMOVED',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });
        });
      });

      describe('Editing the other informations of the relation', () => {
        it('Should handle the edition of the other properties correctly by updating the opposite attribute in the other cases', () => {
          const contentTypeUID = 'api::address.address';
          const addressContentType = initCT('address', {
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'many_to_many_left',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_right',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'many_to_many_right',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_left',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });

          const initializedState = init({
            contentTypes: {
              [contentTypeUID]: addressContentType,
            },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_right_updated',
              target: contentTypeUID,
              type: 'relation',
              name: 'many_to_many_left',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            name: 'many_to_many_left',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'many_to_many_left',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_right_updated',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'many_to_many_right_updated',
                relation: 'manyToMany',
                targetAttribute: 'many_to_many_left',
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
            ],
          });
        });

        it('Should handle the edition of the name of the relation correctly for a one side relation', () => {
          const contentTypeUID = 'api::address.address';
          const contentType = initCT('address', {
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way',
                relation: 'oneToOne',
                targetAttribute: null,
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
            ],
          });

          const initializedState = init({
            contentTypes: {
              [contentTypeUID]: contentType,
            },
          });

          const action = actions.editAttribute({
            attributeToSet: {
              relation: 'oneToOne',
              targetAttribute: null,
              target: contentTypeUID,
              type: 'relation',
              name: 'one_way_updated',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            name: 'one_way',
          });

          const state = reducer(initializedState, action);

          expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
            status: 'CHANGED',
            attributes: [
              { name: 'postal_code', type: 'string' },
              {
                name: 'one_way_updated',
                relation: 'oneToOne',
                targetAttribute: null,
                target: contentTypeUID,
                type: 'relation',
              },
              {
                name: 'category',
                relation: 'oneToOne',
                target: 'api::category.category',
                targetAttribute: null,
                type: 'relation',
              },
              {
                name: 'cover',
                type: 'media',
                multiple: false,
                required: false,
              },
            ],
          });
        });
      });
    });

    describe('Editing a relation with another content type', () => {
      it('Should not create an opposite attribute if the target is the same content type and the nature is a one side relation (oneWay, manyWay)', () => {
        const contentTypeUID = 'api::category.category';
        const updatedTargetUID = 'api::address.address';
        const contentType = initCT('address', {
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_way',
              relation: 'oneToOne',
              targetAttribute: null,
              target: contentTypeUID,
              type: 'relation',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });

        const initializedState = init({
          contentTypes: { [contentTypeUID]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            relation: 'oneToOne',
            targetAttribute: null,
            target: updatedTargetUID,
            type: 'relation',
            name: 'one_way',
          },
          forTarget: 'contentType',
          targetUid: contentTypeUID,
          name: 'one_way',
        });

        const state = reducer(initializedState, action);

        expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_way',
              relation: 'oneToOne',
              targetAttribute: null,
              target: updatedTargetUID,
              type: 'relation',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });
      });

      it('Should create an opposite attribute if the target is the same content type and the nature is not a one side relation (oneToOne, ...)', () => {
        const contentTypeUID = 'api::address.address';
        const contentType = initCT('address', {
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_to_many',
              relation: 'oneToMany',
              target: 'api::address.address',
              type: 'relation',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });

        const initializedState = init({
          contentTypes: {
            [contentType.uid]: contentType,
          },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            relation: 'oneToMany',
            targetAttribute: 'many_to_one',
            target: contentTypeUID,
            type: 'relation',
            name: 'one_to_many',
          },
          forTarget: 'contentType',
          targetUid: contentTypeUID,
          name: 'one_to_many',
        });

        const state = reducer(initializedState, action);

        expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_to_many',
              relation: 'oneToMany',
              targetAttribute: 'many_to_one',
              target: contentTypeUID,
              type: 'relation',
              status: 'CHANGED',
            },

            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
            {
              name: 'many_to_one',
              relation: 'manyToOne',
              targetAttribute: 'one_to_many',
              target: contentTypeUID,
              type: 'relation',
              status: 'NEW',
            },
          ],
        });
      });

      it('Should create an opposite attribute if the target is the same content type and the nature is manyToMany', () => {
        const originalTargetUID = 'api::category.category';
        const contentTypeUID = 'api::address.address';
        const contentType = initCT('address', {
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'many_to_many_left',
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_right',
              target: originalTargetUID,
              type: 'relation',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });

        const originalTargetContentType = initCT('category', {
          attributes: [
            { name: 'name', type: 'string', required: true },
            {
              name: 'many_to_many_right',
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_left',
              target: contentTypeUID,
              type: 'relation',
            },
          ],
        });

        const initializedState = init({
          contentTypes: {
            [contentTypeUID]: contentType,
            [originalTargetUID]: originalTargetContentType,
          },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            relation: 'manyToMany',
            targetAttribute: 'many_to_many_right',
            target: contentTypeUID,
            type: 'relation',
            name: 'many_to_many_left',
          },
          forTarget: 'contentType',
          targetUid: contentTypeUID,
          name: 'many_to_many_left',
        });

        const state = reducer(initializedState, action);

        expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'many_to_many_left',
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_right',
              target: contentTypeUID,
              type: 'relation',
              status: 'CHANGED',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
            {
              name: 'many_to_many_right',
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_left',
              target: contentTypeUID,
              type: 'relation',
              status: 'NEW',
            },
          ],
        });

        expect(state.current.contentTypes[originalTargetUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'name', type: 'string', required: true },
            {
              name: 'many_to_many_right',
              relation: 'manyToMany',
              targetAttribute: 'many_to_many_left',
              target: contentTypeUID,
              type: 'relation',
              status: 'REMOVED',
            },
          ],
        });
      });
    });

    describe('Editing a relation and preserve plugin options', () => {
      it('Should save pluginOptions if the relation is a one side relation (oneWay, manyWay)', () => {
        const contentTypeUID = 'api::category.category';
        const updatedTargetUID = 'api::address.address';
        const contentType = initCT('address', {
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_way',
              relation: 'oneToOne',
              targetAttribute: null,
              target: contentTypeUID,
              type: 'relation',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });

        const initializedState = init({
          contentTypes: { [contentTypeUID]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            relation: 'oneToOne',
            targetAttribute: null,
            target: updatedTargetUID,
            type: 'relation',
            name: 'one_way',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'contentType',
          targetUid: contentTypeUID,
          name: 'one_way',
        });

        const state = reducer(initializedState, action);

        expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_way',
              relation: 'oneToOne',
              targetAttribute: null,
              target: updatedTargetUID,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });
      });

      it('Should preserve plugin options on the opposite attribute if the target is a the same content type and the nature is not a one side relation (oneToOne, ...)', () => {
        const contentTypeUID = 'api::address.address';
        const contentType = initCT('address', {
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_to_many',
              relation: 'oneToMany',
              targetAttribute: 'many_to_one',
              target: contentTypeUID,
              type: 'relation',
            },
            {
              name: 'many_to_one',
              relation: 'manyToOne',
              targetAttribute: 'one_to_many',
              target: contentTypeUID,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });

        const initializedState = init({
          contentTypes: { [contentTypeUID]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            relation: 'oneToMany',
            targetAttribute: 'many_to_one',
            target: contentTypeUID,
            type: 'relation',
            name: 'one_to_many',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'contentType',
          targetUid: contentTypeUID,
          name: 'one_to_many',
        });

        const state = reducer(initializedState, action);

        expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            { name: 'postal_code', type: 'string' },
            {
              name: 'one_to_many',
              relation: 'oneToMany',
              targetAttribute: 'many_to_one',
              target: contentTypeUID,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
            {
              name: 'many_to_one',
              relation: 'manyToOne',
              targetAttribute: 'one_to_many',
              target: contentTypeUID,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
            {
              name: 'category',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              type: 'relation',
            },
            {
              name: 'cover',
              type: 'media',
              multiple: false,
              required: false,
            },
          ],
        });
      });

      it('Should save pluginOptions if the relation is nested inside a component', () => {
        const componentUID = 'default.dish';
        const contentType = initCT('address', {
          attributes: [
            {
              name: 'dishes',
              component: componentUID,
              type: 'component',
              repeatable: true,
            },
            { name: 'dynamiczone', type: 'dynamiczone', components: [componentUID] },
          ],
        });

        const component = initCompo('dish', {
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
            },
          ],
        });

        const initializedState = init({
          components: { [component.uid]: component },
          contentTypes: { [contentType.uid]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            name: 'address',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: null,
            type: 'relation',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'component',
          targetUid: componentUID,
          name: 'address',
        });

        const state = reducer(initializedState, action);

        expect(state.current.components[componentUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
          ],
        });
      });

      it('Should preserve pluginOptions if the relation is nested inside a component', () => {
        const componentUID = 'default.dish';
        const contentType = initCT('address', {
          attributes: [
            {
              name: 'dishes',
              component: componentUID,
              type: 'component',
              repeatable: true,
            },
            { name: 'dynamiczone', type: 'dynamiczone', components: [componentUID] },
          ],
        });

        const component = initCompo('dish', {
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
            },
          ],
        });

        const initializedState = init({
          components: { [component.uid]: component },
          contentTypes: { [contentType.uid]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            name: 'address-new',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: null,
            type: 'relation',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'component',
          targetUid: componentUID,
          name: 'address',
        });

        const state = reducer(initializedState, action);

        expect(state.current.components[componentUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address-new',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
          ],
        });
      });

      it('Should save pluginOptions if the relation is nested inside a dynamic zone', () => {
        const componentUID = 'default.dish';
        const contentType = initCT('address', {
          attributes: [{ name: 'dynamiczone', type: 'dynamiczone', components: [componentUID] }],
        });

        const component = initCompo('dish', {
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
            },
          ],
        });

        const initializedState = init({
          components: { [component.uid]: component },
          contentTypes: { [contentType.uid]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            name: 'address',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: null,
            type: 'relation',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'component',
          targetUid: componentUID,
          name: 'address',
        });

        const state = reducer(initializedState, action);

        expect(state.current.components[componentUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
          ],
        });
      });

      it('Should preserve pluginOptions if the relation is nested inside a dynamic zone', () => {
        const componentUID = 'default.dish';
        const contentType = initCT('address', {
          attributes: [{ name: 'dynamiczone', type: 'dynamiczone', components: [componentUID] }],
        });

        const component = initCompo('dish', {
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
            },
          ],
        });

        const initializedState = init({
          components: { [component.uid]: component },
          contentTypes: { [contentType.uid]: contentType },
        });

        const action = actions.editAttribute({
          attributeToSet: {
            name: 'address-new',
            relation: 'oneToOne',
            target: 'api::address.address',
            targetAttribute: null,
            type: 'relation',
            pluginOptions: {
              myplugin: {
                example: 'first',
              },
            },
          },
          forTarget: 'component',
          targetUid: componentUID,
          name: 'address',
        });

        const state = reducer(initializedState, action);

        expect(state.current.components[componentUID]).toMatchObject({
          status: 'CHANGED',
          attributes: [
            {
              name: 'name',
              type: 'string',
              required: true,
              default: 'My super dish',
            },
            {
              name: 'description',
              type: 'text',
            },
            {
              name: 'price',
              type: 'float',
            },
            {
              name: 'address-new',
              relation: 'oneToOne',
              target: 'api::address.address',
              targetAttribute: null,
              type: 'relation',
              pluginOptions: {
                myplugin: {
                  example: 'first',
                },
              },
              status: 'CHANGED',
            },
          ],
        });
      });
    });
  });
});
