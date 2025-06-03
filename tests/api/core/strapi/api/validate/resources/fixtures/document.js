'use strict';

module.exports = (fixtures) => {
  const { relation } = fixtures;

  return [
    {
      name: '3 Document A',
      name_private: 'Private Document A',
      name_non_searchable: 'No Search A',
      name_hidden: 'Hidden Document A',
      name_non_writable: 'No Write A',
      password: 'Password1234',
      misc: 2,
      relations: [relation[0].id, relation[1].id],
      private_relations: [relation[0].id, relation[1].id],
      componentA: {
        name: 'Component A Name A',
        name_private: 'Private Component A Name A',
        password: 'compPass9101',
      },
      dz: [
        {
          __component: 'default.component-a',
          name: 'Name A',
          name_private: 'Private Name A',
          password: 'Password A',
        },
        {
          __component: 'default.component-b',
          name: 'Name B',
          name_private: 'Private Name B',
          password: 'Password B',
        },
        {
          __component: 'default.component-a',
          name: 'Name C',
          name_private: 'Private Name C',
          password: 'Password C',
        },
      ],
    },
    {
      name: '1 Document B OO',
      name_private: 'Private Document B 45',
      name_non_searchable: 'No Search B',
      name_hidden: 'Hidden Document B',
      name_non_writable: 'No Write B',
      password: 'Password5678',
      misc: 3,
      relations: [relation[1].id],
      private_relations: [relation[1].id],
      componentA: {
        name: 'Component A Name B',
        name_private: 'Private Component A Name B',
        password: 'compPass5678',
      },
      dz: [
        {
          __component: 'default.component-a',
          name: 'Name A',
          name_private: 'Private Name A',
          password: 'Password A',
        },
        {
          __component: 'default.component-b',
          name: 'Name B',
          name_private: 'Private Name B',
          password: 'Password B',
        },
        {
          __component: 'default.component-a',
          name: 'Name C',
          name_private: 'Private Name C',
          password: 'Password C',
        },
      ],
    },
    {
      name: '2 Document C OO',
      name_private: 'Private Document C 45',
      name_non_searchable: 'No Search C',
      name_hidden: 'Hidden Document C',
      name_non_writable: 'No Write C',
      password: 'Password9012',
      misc: 1,
      relations: [relation[0].id],
      componentA: {
        name: 'Component A Name C',
        name_private: 'Private Component A Name C',
        password: 'compPass1234',
      },
      dz: [
        {
          __component: 'default.component-a',
          name: 'Name A',
          name_private: 'Private Name A',
          password: 'Password A',
        },
        {
          __component: 'default.component-b',
          name: 'Name B',
          name_private: 'Private Name B',
          password: 'Password B',
        },
        {
          __component: 'default.component-a',
          name: 'Name C',
          name_private: 'Private Name C',
          password: 'Password C',
        },
      ],
    },
  ];
};
