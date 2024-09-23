export const baseMetadata = {
  uid: 'api::complex.complex',
  singularName: 'complex',
  tableName: 'complexes',
  attributes: {
    id: {
      type: 'increments',
      columnName: 'id',
    },
    documentId: {
      type: 'string',
      columnName: 'document_id',
    },
    // More attributes can be added through the buildMetadataWith function
  },
  lifecycles: {},
  indexes: [],
  foreignKeys: [],
  columnToAttribute: {
    id: 'id',
    document_id: 'documentId',
  },
};

export const expectedMetadataResults = {
  simple: {
    string: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            superlongtitlefortestingpurposes: {
              type: 'string',
              columnName: 'superlongtitlefortestingpurposes',
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            superlongtitlefortestingpurposes: 'superlongtitlefortestingpurposes',
          },
        },
      ],
    ],
  },
  relations: {
    oneToOne: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            complexhasonecomplex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexhasonecomplex_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            complexhasonecomplex: 'complexhasonecomplex',
          },
        },
      ],
      [
        'complexes_complexhasonecomplex_links',
        {
          singularName: 'complexes_complexhasonecomplex_links',
          uid: 'complexes_complexhasonecomplex_links',
          tableName: 'complexes_complexhasonecomplex_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            inv_complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'inv_complex_id',
            },
          },
          indexes: [
            {
              name: 'complexes_complexhasonecomplex_links_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_complexhasonecomplex_links_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_complexhasonecomplex_links_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_complexhasonecomplex_links_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_complexhasonecomplex_links_inv_fk',
              columns: ['inv_complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            complex_id: 'complex_id',
            inv_complex_id: 'inv_complex_id',
          },
        },
      ],
    ],
    oneToMany: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            complexbelongstomanycomplexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              mappedBy: 'complex',
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            complexbelongstomanycomplexes: 'complexbelongstomanycomplexes',
          },
        },
      ],
    ],
    manyToOne: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            complexhasmanycomplexes: {
              type: 'relation',
              relation: 'manyToOne',
              target: 'api::complex.complex',
              inversedBy: 'complexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexhasmanycomplexes_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
                inverseOrderColumnName: 'complex_order',
              },
            },
            complexes: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::complex.complex',
              mappedBy: 'complexeshasandbelongstomanycomplexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexhasmanycomplexes_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
                orderColumnName: 'complex_order',
                orderBy: {
                  complex_order: 'asc',
                },
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            complexhasmanycomplexes: 'complexhasmanycomplexes',
            complexes: 'complexes',
          },
        },
      ],
      [
        'complexes_complexhasmanycomplexes_links',
        {
          singularName: 'complexes_complexhasmanycomplexes_links',
          uid: 'complexes_complexhasmanycomplexes_links',
          tableName: 'complexes_complexhasmanycomplexes_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            inv_complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'inv_complex_id',
            },
            complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_order',
            },
          },
          indexes: [
            {
              name: 'complexes_complexhasmanycomplexes_links_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_complexhasmanycomplexes_links_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_complexhasmanycomplexes_links_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complexes_complexhasmanycomplexes_links_order_inv_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_complexhasmanycomplexes_links_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_complexhasmanycomplexes_links_inv_fk',
              columns: ['inv_complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            complex_id: 'complex_id',
            inv_complex_id: 'inv_complex_id',
            complex_order: 'complex_order',
          },
        },
      ],
    ],
    inversedOneToOne: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            complexhasandbelongstoonecomplex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              inversedBy: 'complex',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexhasandbelongstoonecomplex_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
              },
            },
            complex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              mappedBy: 'complexhasandbelongstoonecomplex',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexhasandbelongstoonecomplex_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            complexhasandbelongstoonecomplex: 'complexhasandbelongstoonecomplex',
            complex: 'complex',
          },
        },
      ],
      [
        'complexes_complexhasandbelongstoonecomplex_links',
        {
          singularName: 'complexes_complexhasandbelongstoonecomplex_links',
          uid: 'complexes_complexhasandbelongstoonecomplex_links',
          tableName: 'complexes_complexhasandbelongstoonecomplex_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            inv_complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'inv_complex_id',
            },
          },
          indexes: [
            {
              name: 'complexes_complexhasandbelongstoonecomplex_links_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_complexhasandbelongstoonecomplex_links_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_complexhasandbelongstoonecomplex_links_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_complexhasandbelongstoonecomplex_links_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_complexhasandbelongstoonecomplex_links_inv_fk',
              columns: ['inv_complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            complex_id: 'complex_id',
            inv_complex_id: 'inv_complex_id',
          },
        },
      ],
    ],
    manyToMany: [
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
            complexeshasandbelongstomanycomplexes: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::complex.complex',
              inversedBy: 'complexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexeshasandbelongstomanycomplexes_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
                orderColumnName: 'complex_order',
                orderBy: {
                  complex_order: 'asc',
                },
                inverseOrderColumnName: 'inv_complex_order',
              },
            },
            complexes: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::complex.complex',
              mappedBy: 'complexeshasandbelongstomanycomplexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_complexeshasandbelongstomanycomplexes_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
                orderColumnName: 'inv_complex_order',
                orderBy: {
                  inv_complex_order: 'asc',
                },
                inverseOrderColumnName: 'complex_order',
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            complexeshasandbelongstomanycomplexes: 'complexeshasandbelongstomanycomplexes',
            complexes: 'complexes',
          },
        },
      ],
      [
        'complexes_complexeshasandbelongstomanycomplexes_links',
        {
          singularName: 'complexes_complexeshasandbelongstomanycomplexes_links',
          uid: 'complexes_complexeshasandbelongstomanycomplexes_links',
          tableName: 'complexes_complexeshasandbelongstomanycomplexes_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            inv_complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'inv_complex_id',
            },
            complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_order',
            },
            inv_complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'inv_complex_order',
            },
          },
          indexes: [
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_order_fk',
              columns: ['complex_order'],
            },
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_order_inv_fk',
              columns: ['inv_complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_complexeshasandbelongstomanycomplexes_links_inv_fk',
              columns: ['inv_complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            complex_id: 'complex_id',
            inv_complex_id: 'inv_complex_id',
            complex_order: 'complex_order',
            inv_complex_order: 'inv_complex_order',
          },
        },
      ],
    ],
    morphToMany: [
      [
        'default.long-component-name',
        {
          uid: 'default.long-component-name',
          singularName: 'long-component-name',
          tableName: 'components_default_long_component_names',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            longcomponentname: {
              type: 'string',
              columnName: 'longcomponentname',
            },
            complex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complex_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
              },
            },
            complexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complexes_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
                orderColumnName: 'complex_order',
                orderBy: {
                  complex_order: 'asc',
                },
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            longcomponentname: 'longcomponentname',
            complex: 'complex',
            complexes: 'complexes',
          },
        },
      ],
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
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
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            morphToMany: 'morphToMany',
          },
        },
      ],
      [
        'components_default_long_component_names_complex_links',
        {
          singularName: 'components_default_long_component_names_complex_links',
          uid: 'components_default_long_component_names_complex_links',
          tableName: 'components_default_long_component_names_complex_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
          },
        },
      ],
      [
        'components_default_long_component_names_complexes_links',
        {
          singularName: 'components_default_long_component_names_complexes_links',
          uid: 'components_default_long_component_names_complexes_links',
          tableName: 'components_default_long_component_names_complexes_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_order',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'components_default_long_component_names_complexes_links_order_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
            complex_order: 'complex_order',
          },
        },
      ],
    ],
  },
  components: {
    repeatable: [
      [
        'default.long-component-name',
        {
          uid: 'default.long-component-name',
          singularName: 'long-component-name',
          tableName: 'components_default_long_component_names',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            longcomponentname: {
              type: 'string',
              columnName: 'longcomponentname',
            },
            complex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complex_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
              },
            },
            complexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complexes_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
                orderColumnName: 'complex_order',
                orderBy: {
                  complex_order: 'asc',
                },
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            longcomponentname: 'longcomponentname',
            complex: 'complex',
            complexes: 'complexes',
          },
        },
      ],
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
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
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            repeatable: 'repeatable',
          },
        },
      ],
      [
        'components_default_long_component_names_complex_links',
        {
          singularName: 'components_default_long_component_names_complex_links',
          uid: 'components_default_long_component_names_complex_links',
          tableName: 'components_default_long_component_names_complex_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
          },
        },
      ],
      [
        'components_default_long_component_names_complexes_links',
        {
          singularName: 'components_default_long_component_names_complexes_links',
          uid: 'components_default_long_component_names_complexes_links',
          tableName: 'components_default_long_component_names_complexes_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_order',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'components_default_long_component_names_complexes_links_order_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
            complex_order: 'complex_order',
          },
        },
      ],
    ],
    single: [
      [
        'default.long-component-name',
        {
          uid: 'default.long-component-name',
          singularName: 'long-component-name',
          tableName: 'components_default_long_component_names',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            longcomponentname: {
              type: 'string',
              columnName: 'longcomponentname',
            },
            complex: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complex_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
              },
            },
            complexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              joinTable: {
                __internal__: true,
                name: 'components_default_long_component_names_complexes_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_long_component_names',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
                orderColumnName: 'complex_order',
                orderBy: {
                  complex_order: 'asc',
                },
              },
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            longcomponentname: 'longcomponentname',
            complex: 'complex',
            complexes: 'complexes',
          },
        },
      ],
      [
        'api::complex.complex',
        {
          uid: 'api::complex.complex',
          singularName: 'complex',
          tableName: 'complexes',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            documentId: {
              type: 'string',
              columnName: 'document_id',
            },
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
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            single: 'single',
          },
        },
      ],
      [
        'components_default_long_component_names_complex_links',
        {
          singularName: 'components_default_long_component_names_complex_links',
          uid: 'components_default_long_component_names_complex_links',
          tableName: 'components_default_long_component_names_complex_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complex_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complex_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complex_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
          },
        },
      ],
      [
        'components_default_long_component_names_complexes_links',
        {
          singularName: 'components_default_long_component_names_complexes_links',
          uid: 'components_default_long_component_names_complexes_links',
          tableName: 'components_default_long_component_names_complexes_links',
          attributes: {
            id: {
              type: 'increments',
              columnName: 'id',
            },
            long_component_name_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'long_component_name_id',
            },
            complex_id: {
              type: 'integer',
              column: {
                unsigned: true,
              },
              columnName: 'complex_id',
            },
            complex_order: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_order',
            },
          },
          indexes: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'components_default_long_component_names_complexes_links_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'components_default_long_component_names_complexes_links_order_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'components_default_long_component_names_complexes_links_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_long_component_names',
              onDelete: 'CASCADE',
            },
            {
              name: 'components_default_long_component_names_complexes_links_inv_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
          ],
          lifecycles: {},
          columnToAttribute: {
            id: 'id',
            long_component_name_id: 'long_component_name_id',
            complex_id: 'complex_id',
            complex_order: 'complex_order',
          },
        },
      ],
    ],
  },
  dynamicZone: [
    [
      'default.long-component-name',
      {
        uid: 'default.long-component-name',
        singularName: 'long-component-name',
        tableName: 'components_default_long_component_names',
        attributes: {
          id: {
            type: 'increments',
            columnName: 'id',
          },
          longcomponentname: {
            type: 'string',
            columnName: 'longcomponentname',
          },
          complex: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::complex.complex',
            joinTable: {
              __internal__: true,
              name: 'components_default_long_component_names_complex_links',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
                referencedTable: 'components_default_long_component_names',
              },
              inverseJoinColumn: {
                name: 'complex_id',
                referencedColumn: 'id',
                referencedTable: 'complexes',
              },
              pivotColumns: ['long_component_name_id', 'complex_id'],
            },
          },
          complexes: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::complex.complex',
            joinTable: {
              __internal__: true,
              name: 'components_default_long_component_names_complexes_links',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
                referencedTable: 'components_default_long_component_names',
              },
              inverseJoinColumn: {
                name: 'complex_id',
                referencedColumn: 'id',
                referencedTable: 'complexes',
              },
              pivotColumns: ['long_component_name_id', 'complex_id'],
              orderColumnName: 'complex_order',
              orderBy: {
                complex_order: 'asc',
              },
            },
          },
        },
        lifecycles: {},
        indexes: [],
        foreignKeys: [],
        columnToAttribute: {
          id: 'id',
          longcomponentname: 'longcomponentname',
          complex: 'complex',
          complexes: 'complexes',
        },
      },
    ],
    [
      'api::complex.complex',
      {
        uid: 'api::complex.complex',
        singularName: 'complex',
        tableName: 'complexes',
        attributes: {
          id: {
            type: 'increments',
            columnName: 'id',
          },
          documentId: {
            type: 'string',
            columnName: 'document_id',
          },
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
        lifecycles: {},
        indexes: [],
        foreignKeys: [],
        columnToAttribute: {
          id: 'id',
          document_id: 'documentId',
          dz: 'dz',
        },
      },
    ],
    [
      'components_default_long_component_names_complex_links',
      {
        singularName: 'components_default_long_component_names_complex_links',
        uid: 'components_default_long_component_names_complex_links',
        tableName: 'components_default_long_component_names_complex_links',
        attributes: {
          id: {
            type: 'increments',
            columnName: 'id',
          },
          long_component_name_id: {
            type: 'integer',
            column: {
              unsigned: true,
            },
            columnName: 'long_component_name_id',
          },
          complex_id: {
            type: 'integer',
            column: {
              unsigned: true,
            },
            columnName: 'complex_id',
          },
        },
        indexes: [
          {
            name: 'components_default_long_component_names_complex_links_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'components_default_long_component_names_complex_links_inv_fk',
            columns: ['complex_id'],
          },
          {
            name: 'components_default_long_component_names_complex_links_unique',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
        ],
        foreignKeys: [
          {
            name: 'components_default_long_component_names_complex_links_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_long_component_names',
            onDelete: 'CASCADE',
          },
          {
            name: 'components_default_long_component_names_complex_links_inv_fk',
            columns: ['complex_id'],
            referencedColumns: ['id'],
            referencedTable: 'complexes',
            onDelete: 'CASCADE',
          },
        ],
        lifecycles: {},
        columnToAttribute: {
          id: 'id',
          long_component_name_id: 'long_component_name_id',
          complex_id: 'complex_id',
        },
      },
    ],
    [
      'components_default_long_component_names_complexes_links',
      {
        singularName: 'components_default_long_component_names_complexes_links',
        uid: 'components_default_long_component_names_complexes_links',
        tableName: 'components_default_long_component_names_complexes_links',
        attributes: {
          id: {
            type: 'increments',
            columnName: 'id',
          },
          long_component_name_id: {
            type: 'integer',
            column: {
              unsigned: true,
            },
            columnName: 'long_component_name_id',
          },
          complex_id: {
            type: 'integer',
            column: {
              unsigned: true,
            },
            columnName: 'complex_id',
          },
          complex_order: {
            type: 'float',
            column: {
              unsigned: true,
              defaultTo: null,
            },
            columnName: 'complex_order',
          },
        },
        indexes: [
          {
            name: 'components_default_long_component_names_complexes_links_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'components_default_long_component_names_complexes_links_inv_fk',
            columns: ['complex_id'],
          },
          {
            name: 'components_default_long_component_names_complexes_links_unique',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
          {
            name: 'components_default_long_component_names_complexes_links_order_fk',
            columns: ['complex_order'],
          },
        ],
        foreignKeys: [
          {
            name: 'components_default_long_component_names_complexes_links_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_long_component_names',
            onDelete: 'CASCADE',
          },
          {
            name: 'components_default_long_component_names_complexes_links_inv_fk',
            columns: ['complex_id'],
            referencedColumns: ['id'],
            referencedTable: 'complexes',
            onDelete: 'CASCADE',
          },
        ],
        lifecycles: {},
        columnToAttribute: {
          id: 'id',
          long_component_name_id: 'long_component_name_id',
          complex_id: 'complex_id',
          complex_order: 'complex_order',
        },
      },
    ],
  ],
};

type MetadataAttributes<T = typeof expectedMetadataResults> = {
  [P in keyof T]: T[P] extends { [key: string]: infer U } ? U : never;
}[keyof T];

export const buildMetadataWith = (attributes: MetadataAttributes) => {
  const metadata = { ...baseMetadata };

  // Map the attribute keys to the column names
  const attributeColumns = Object.keys(attributes).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {} as any);
  metadata.columnToAttribute = {
    ...metadata.columnToAttribute,
    ...attributeColumns,
  };
  metadata.attributes = { ...metadata.attributes, ...attributes };
  return [[metadata.uid, metadata]];
};
