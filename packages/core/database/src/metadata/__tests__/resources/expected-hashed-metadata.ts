export const expectedMetadataHashedResults = {
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
              columnName: 'superlongtitlefortesff79b',
            },
          },
          lifecycles: {},
          indexes: [],
          foreignKeys: [],
          columnToAttribute: {
            id: 'id',
            document_id: 'documentId',
            superlongtitlefortesff79b: 'superlongtitlefortestingpurposes',
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
                name: 'complexes_comp5354f_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
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
        'complexes_comp5354f_links',
        {
          singularName: 'complexes_comp5354f_links',
          uid: 'complexes_comp5354f_links',
          tableName: 'complexes_comp5354f_links',
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
              name: 'complexes_comp53564c5f_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_com64c5f_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_com64c5f_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comp53564c5f_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_com64c5f_inv_fk',
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
                name: 'complexes_comp3e8ce_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
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
                name: 'complexes_comp3e8ce_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
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
        'complexes_comp3e8ce_links',
        {
          singularName: 'complexes_comp3e8ce_links',
          uid: 'complexes_comp3e8ce_links',
          tableName: 'complexes_comp3e8ce_links',
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
              name: 'complexes_comp3e825c1c_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_com25c1c_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_com25c1c_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complex25c1c_order_inv_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comp3e825c1c_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_com25c1c_inv_fk',
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
                name: 'complexes_comp64178_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                },
                pivotColumns: ['complex_id', 'inv_complex_id'],
              },
            },
            complex: {
              type: 'relation',
              relation: 'manyToOne',
              target: 'api::complex.complex',
              inversedBy: 'complexbelongstomanycomplexes',
              joinTable: {
                name: 'complexes_comp64178_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
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
        'complexes_comp64178_links',
        {
          singularName: 'complexes_comp64178_links',
          uid: 'complexes_comp64178_links',
          tableName: 'complexes_comp64178_links',
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
              name: 'complexes_comp641aac64_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_comaac64_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_comaac64_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comp641aac64_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_comaac64_inv_fk',
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
                name: 'complexes_comp61dc1_links',
                joinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
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
                name: 'complexes_comp61dc1_links',
                joinColumn: {
                  name: 'inv_complex_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
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
        'complexes_comp61dc1_links',
        {
          singularName: 'complexes_comp61dc1_links',
          uid: 'complexes_comp61dc1_links',
          tableName: 'complexes_comp61dc1_links',
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
              name: 'complexes_comp61d33276_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_com33276_inv_fk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_com33276_unique',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complexes_c33276_order_fk',
              columns: ['complex_order'],
            },
            {
              name: 'complex33276_order_inv_fk',
              columns: ['inv_complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comp61d33276_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_com33276_inv_fk',
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
  },
  components: {
    repeatable: [
      [
        'default.long-component-name',
        {
          uid: 'default.long-component-name',
          singularName: 'long-component-name',
          tableName: 'components_default_l807d8',
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
                name: 'componca426_complex_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
              },
            },
            complexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              joinTable: {
                name: 'compca426_complexes_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
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
        'componca426_complex_links',
        {
          singularName: 'componca426_complex_links',
          uid: 'componca426_complex_links',
          tableName: 'componca426_complex_links',
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
              name: 'componca426_compl600cd_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'componca426_c600cd_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'componca426_c600cd_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'componca426_compl600cd_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'componca426_c600cd_inv_fk',
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
        'compca426_complexes_links',
        {
          singularName: 'compca426_complexes_links',
          uid: 'compca426_complexes_links',
          tableName: 'compca426_complexes_links',
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
              name: 'compca426_complex8bbef_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'compca426_com8bbef_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'compca426_com8bbef_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'compca426_c8bbef_order_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'compca426_complex8bbef_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'compca426_com8bbef_inv_fk',
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
          tableName: 'components_default_l807d8',
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
                name: 'componca426_complex_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
              },
            },
            complexes: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::complex.complex',
              joinTable: {
                name: 'compca426_complexes_links',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
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
        'componca426_complex_links',
        {
          singularName: 'componca426_complex_links',
          uid: 'componca426_complex_links',
          tableName: 'componca426_complex_links',
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
              name: 'componca426_compl600cd_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'componca426_c600cd_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'componca426_c600cd_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'componca426_compl600cd_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'componca426_c600cd_inv_fk',
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
        'compca426_complexes_links',
        {
          singularName: 'compca426_complexes_links',
          uid: 'compca426_complexes_links',
          tableName: 'compca426_complexes_links',
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
              name: 'compca426_complex8bbef_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'compca426_com8bbef_inv_fk',
              columns: ['complex_id'],
            },
            {
              name: 'compca426_com8bbef_unique',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'compca426_c8bbef_order_fk',
              columns: ['complex_order'],
            },
          ],
          foreignKeys: [
            {
              name: 'compca426_complex8bbef_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'compca426_com8bbef_inv_fk',
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
        tableName: 'components_default_l807d8',
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
              name: 'componca426_complex_links',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
              },
              inverseJoinColumn: {
                name: 'complex_id',
                referencedColumn: 'id',
              },
              pivotColumns: ['long_component_name_id', 'complex_id'],
            },
          },
          complexes: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::complex.complex',
            joinTable: {
              name: 'compca426_complexes_links',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
              },
              inverseJoinColumn: {
                name: 'complex_id',
                referencedColumn: 'id',
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
      'componca426_complex_links',
      {
        singularName: 'componca426_complex_links',
        uid: 'componca426_complex_links',
        tableName: 'componca426_complex_links',
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
            name: 'componca426_compl600cd_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'componca426_c600cd_inv_fk',
            columns: ['complex_id'],
          },
          {
            name: 'componca426_c600cd_unique',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
        ],
        foreignKeys: [
          {
            name: 'componca426_compl600cd_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_l807d8',
            onDelete: 'CASCADE',
          },
          {
            name: 'componca426_c600cd_inv_fk',
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
      'compca426_complexes_links',
      {
        singularName: 'compca426_complexes_links',
        uid: 'compca426_complexes_links',
        tableName: 'compca426_complexes_links',
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
            name: 'compca426_complex8bbef_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'compca426_com8bbef_inv_fk',
            columns: ['complex_id'],
          },
          {
            name: 'compca426_com8bbef_unique',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
          {
            name: 'compca426_c8bbef_order_fk',
            columns: ['complex_order'],
          },
        ],
        foreignKeys: [
          {
            name: 'compca426_complex8bbef_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_l807d8',
            onDelete: 'CASCADE',
          },
          {
            name: 'compca426_com8bbef_inv_fk',
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
