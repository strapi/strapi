export const auxComponent = {
  uid: 'default.long-component-name',
  singularName: 'long-component-name',
  tableName: 'components_default_long_component_names',
  attributes: {
    id: {
      type: 'increments',
    },
    longcomponentname: {
      type: 'string',
    },
    complex: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::complex.complex',
    },
    complexes: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::complex.complex',
    },
  },
};

export const baseModel = {
  uid: 'api::complex.complex',
  singularName: 'complex',
  tableName: 'complexes',
  attributes: {
    id: {
      type: 'increments',
    },
    documentId: {
      type: 'string',
    },
  },
};

export const attributes = {
  simple: {
    string: {
      superlongtitlefortestingpurposes: {
        type: 'string',
      },
    },
  },
  relations: {
    oneToOne: {
      complexhasonecomplex: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::complex.complex',
      },
    },
    oneToMany: {
      complexbelongstomanycomplexes: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::complex.complex',
        mappedBy: 'complex',
      },
    },
    manyToOne: {
      complexhasmanycomplexes: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::complex.complex',
        inversedBy: 'complexes',
      },
      complexes: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::complex.complex',
        mappedBy: 'complexeshasandbelongstomanycomplexes',
      },
    },
    inversedOneToOne: {
      complexhasandbelongstoonecomplex: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::complex.complex',
        inversedBy: 'complex',
      },
      complex: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::complex.complex',
        mappedBy: 'complexhasandbelongstoonecomplex',
      },
    },
    manyToMany: {
      complexeshasandbelongstomanycomplexes: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::complex.complex',
        inversedBy: 'complexes',
      },
      complexes: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::complex.complex',
        mappedBy: 'complexeshasandbelongstomanycomplexes',
      },
    },
    morphToMany: {
      morphToMany: {
        type: 'relation',
        relation: 'morphToMany',
        joinTable: {
          name: 'complexes_components',
          joinColumn: {
            name: 'entity_id',
            referencedColumn: 'id',
          },
          inverseJoinColumn: {
            name: 'component_id',
            referencedColumn: 'id',
          },
          on: {
            field: 'repeatable',
          },
          orderColumnName: 'order',
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
    },
  },
  components: {
    single: {
      single: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'default.long-component-name',
        joinTable: {
          name: 'complexes_components',
          joinColumn: {
            name: 'entity_id',
            referencedColumn: 'id',
          },
          inverseJoinColumn: {
            name: 'component_id',
            referencedColumn: 'id',
          },
          on: {
            field: 'single',
          },
          orderColumnName: 'order',
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
    },
    repeatable: {
      repeatable: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'default.long-component-name',
        joinTable: {
          name: 'complexes_components',
          joinColumn: {
            name: 'entity_id',
            referencedColumn: 'id',
          },
          inverseJoinColumn: {
            name: 'component_id',
            referencedColumn: 'id',
          },
          on: {
            field: 'repeatable',
          },
          orderColumnName: 'order',
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
    },
    dynamicZone: {
      dz: {
        type: 'relation',
        relation: 'morphToMany',
        joinTable: {
          name: 'complexes_components',
          joinColumn: {
            name: 'entity_id',
            referencedColumn: 'id',
          },
          morphColumn: {
            idColumn: {
              name: 'component_id',
              referencedColumn: 'id',
            },
            typeColumn: {
              name: 'component_type',
            },
            typeField: '__component',
          },
          on: {
            field: 'dz',
          },
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
    },
  },
};

type ModelAttributes<T = typeof attributes> = {
  [P in keyof T]: T[P] extends { [key: string]: infer U } ? U : never;
}[keyof T];

export const buildModelWith = (attributes: ModelAttributes) => {
  const model = { ...baseModel };
  model.attributes = { ...model.attributes, ...attributes };
  return model;
};
