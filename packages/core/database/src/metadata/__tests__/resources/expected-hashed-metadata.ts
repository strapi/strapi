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
                __internal__: true,
                name: 'complexes_comple5354f_lnk',
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
        'complexes_comple5354f_lnk',
        {
          singularName: 'complexes_comple5354f_lnk',
          uid: 'complexes_comple5354f_lnk',
          tableName: 'complexes_comple5354f_lnk',
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
              name: 'complexes_comple53957f_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_comple3957f_ifk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_comple53957f_uq',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comple53957f_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_comple3957f_ifk',
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
                name: 'complexes_comple3e8ce_lnk',
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
                inverseOrderColumnName: 'complex_ord',
              },
            },
            complexes: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::complex.complex',
              mappedBy: 'complexeshasandbelongstomanycomplexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_comple3e8ce_lnk',
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
                orderColumnName: 'complex_ord',
                orderBy: {
                  complex_ord: 'asc',
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
        'complexes_comple3e8ce_lnk',
        {
          singularName: 'complexes_comple3e8ce_lnk',
          uid: 'complexes_comple3e8ce_lnk',
          tableName: 'complexes_comple3e8ce_lnk',
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
            complex_ord: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_ord',
            },
          },
          indexes: [
            {
              name: 'complexes_comple31c773_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_comple1c773_ifk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_comple31c773_uq',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complexes_compl1c773_oifk',
              columns: ['complex_ord'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comple31c773_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_comple1c773_ifk',
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
            complex_ord: 'complex_ord',
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
                name: 'complexes_comple64178_lnk',
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
                name: 'complexes_comple64178_lnk',
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
        'complexes_comple64178_lnk',
        {
          singularName: 'complexes_comple64178_lnk',
          uid: 'complexes_comple64178_lnk',
          tableName: 'complexes_comple64178_lnk',
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
              name: 'complexes_comple68341a_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_comple8341a_ifk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_comple68341a_uq',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comple68341a_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_comple8341a_ifk',
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
                name: 'complexes_comple61dc1_lnk',
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
                orderColumnName: 'complex_ord',
                orderBy: {
                  complex_ord: 'asc',
                },
                inverseOrderColumnName: 'inv_complex_ord',
              },
            },
            complexes: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::complex.complex',
              mappedBy: 'complexeshasandbelongstomanycomplexes',
              joinTable: {
                __internal__: true,
                name: 'complexes_comple61dc1_lnk',
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
                orderColumnName: 'inv_complex_ord',
                orderBy: {
                  inv_complex_ord: 'asc',
                },
                inverseOrderColumnName: 'complex_ord',
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
        'complexes_comple61dc1_lnk',
        {
          singularName: 'complexes_comple61dc1_lnk',
          uid: 'complexes_comple61dc1_lnk',
          tableName: 'complexes_comple61dc1_lnk',
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
            complex_ord: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_ord',
            },
            inv_complex_ord: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'inv_complex_ord',
            },
          },
          indexes: [
            {
              name: 'complexes_comple63adbb_fk',
              columns: ['complex_id'],
            },
            {
              name: 'complexes_comple3adbb_ifk',
              columns: ['inv_complex_id'],
            },
            {
              name: 'complexes_comple63adbb_uq',
              columns: ['complex_id', 'inv_complex_id'],
              type: 'unique',
            },
            {
              name: 'complexes_comple3adbb_ofk',
              columns: ['complex_ord'],
            },
            {
              name: 'complexes_compl3adbb_oifk',
              columns: ['inv_complex_ord'],
            },
          ],
          foreignKeys: [
            {
              name: 'complexes_comple63adbb_fk',
              columns: ['complex_id'],
              referencedColumns: ['id'],
              referencedTable: 'complexes',
              onDelete: 'CASCADE',
            },
            {
              name: 'complexes_comple3adbb_ifk',
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
            complex_ord: 'complex_ord',
            inv_complex_ord: 'inv_complex_ord',
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
                __internal__: true,
                name: 'componen56bca_complex_lnk',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_l807d8',
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
                name: 'compon56bca_complexes_lnk',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_l807d8',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
                orderColumnName: 'complex_ord',
                orderBy: {
                  complex_ord: 'asc',
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
        'componen56bca_complex_lnk',
        {
          singularName: 'componen56bca_complex_lnk',
          uid: 'componen56bca_complex_lnk',
          tableName: 'componen56bca_complex_lnk',
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
              name: 'componen56bca_com62cd7_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'componen56bca_co62cd7_ifk',
              columns: ['complex_id'],
            },
            {
              name: 'componen56bca_com62cd7_uq',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'componen56bca_com62cd7_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'componen56bca_co62cd7_ifk',
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
        'compon56bca_complexes_lnk',
        {
          singularName: 'compon56bca_complexes_lnk',
          uid: 'compon56bca_complexes_lnk',
          tableName: 'compon56bca_complexes_lnk',
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
            complex_ord: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_ord',
            },
          },
          indexes: [
            {
              name: 'compon56bca_compl32aff_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'compon56bca_comp32aff_ifk',
              columns: ['complex_id'],
            },
            {
              name: 'compon56bca_compl32aff_uq',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'compon56bca_comp32aff_ofk',
              columns: ['complex_ord'],
            },
          ],
          foreignKeys: [
            {
              name: 'compon56bca_compl32aff_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'compon56bca_comp32aff_ifk',
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
            complex_ord: 'complex_ord',
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
                __internal__: true,
                name: 'componen56bca_complex_lnk',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_l807d8',
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
                name: 'compon56bca_complexes_lnk',
                joinColumn: {
                  name: 'long_component_name_id',
                  referencedColumn: 'id',
                  referencedTable: 'components_default_l807d8',
                },
                inverseJoinColumn: {
                  name: 'complex_id',
                  referencedColumn: 'id',
                  referencedTable: 'complexes',
                },
                pivotColumns: ['long_component_name_id', 'complex_id'],
                orderColumnName: 'complex_ord',
                orderBy: {
                  complex_ord: 'asc',
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
        'componen56bca_complex_lnk',
        {
          singularName: 'componen56bca_complex_lnk',
          uid: 'componen56bca_complex_lnk',
          tableName: 'componen56bca_complex_lnk',
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
              name: 'componen56bca_com62cd7_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'componen56bca_co62cd7_ifk',
              columns: ['complex_id'],
            },
            {
              name: 'componen56bca_com62cd7_uq',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
          ],
          foreignKeys: [
            {
              name: 'componen56bca_com62cd7_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'componen56bca_co62cd7_ifk',
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
        'compon56bca_complexes_lnk',
        {
          singularName: 'compon56bca_complexes_lnk',
          uid: 'compon56bca_complexes_lnk',
          tableName: 'compon56bca_complexes_lnk',
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
            complex_ord: {
              type: 'float',
              column: {
                unsigned: true,
                defaultTo: null,
              },
              columnName: 'complex_ord',
            },
          },
          indexes: [
            {
              name: 'compon56bca_compl32aff_fk',
              columns: ['long_component_name_id'],
            },
            {
              name: 'compon56bca_comp32aff_ifk',
              columns: ['complex_id'],
            },
            {
              name: 'compon56bca_compl32aff_uq',
              columns: ['long_component_name_id', 'complex_id'],
              type: 'unique',
            },
            {
              name: 'compon56bca_comp32aff_ofk',
              columns: ['complex_ord'],
            },
          ],
          foreignKeys: [
            {
              name: 'compon56bca_compl32aff_fk',
              columns: ['long_component_name_id'],
              referencedColumns: ['id'],
              referencedTable: 'components_default_l807d8',
              onDelete: 'CASCADE',
            },
            {
              name: 'compon56bca_comp32aff_ifk',
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
            complex_ord: 'complex_ord',
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
              __internal__: true,
              name: 'componen56bca_complex_lnk',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
                referencedTable: 'components_default_l807d8',
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
              name: 'compon56bca_complexes_lnk',
              joinColumn: {
                name: 'long_component_name_id',
                referencedColumn: 'id',
                referencedTable: 'components_default_l807d8',
              },
              inverseJoinColumn: {
                name: 'complex_id',
                referencedColumn: 'id',
                referencedTable: 'complexes',
              },
              pivotColumns: ['long_component_name_id', 'complex_id'],
              orderColumnName: 'complex_ord',
              orderBy: {
                complex_ord: 'asc',
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
      'componen56bca_complex_lnk',
      {
        singularName: 'componen56bca_complex_lnk',
        uid: 'componen56bca_complex_lnk',
        tableName: 'componen56bca_complex_lnk',
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
            name: 'componen56bca_com62cd7_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'componen56bca_co62cd7_ifk',
            columns: ['complex_id'],
          },
          {
            name: 'componen56bca_com62cd7_uq',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
        ],
        foreignKeys: [
          {
            name: 'componen56bca_com62cd7_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_l807d8',
            onDelete: 'CASCADE',
          },
          {
            name: 'componen56bca_co62cd7_ifk',
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
      'compon56bca_complexes_lnk',
      {
        singularName: 'compon56bca_complexes_lnk',
        uid: 'compon56bca_complexes_lnk',
        tableName: 'compon56bca_complexes_lnk',
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
          complex_ord: {
            type: 'float',
            column: {
              unsigned: true,
              defaultTo: null,
            },
            columnName: 'complex_ord',
          },
        },
        indexes: [
          {
            name: 'compon56bca_compl32aff_fk',
            columns: ['long_component_name_id'],
          },
          {
            name: 'compon56bca_comp32aff_ifk',
            columns: ['complex_id'],
          },
          {
            name: 'compon56bca_compl32aff_uq',
            columns: ['long_component_name_id', 'complex_id'],
            type: 'unique',
          },
          {
            name: 'compon56bca_comp32aff_ofk',
            columns: ['complex_ord'],
          },
        ],
        foreignKeys: [
          {
            name: 'compon56bca_compl32aff_fk',
            columns: ['long_component_name_id'],
            referencedColumns: ['id'],
            referencedTable: 'components_default_l807d8',
            onDelete: 'CASCADE',
          },
          {
            name: 'compon56bca_comp32aff_ifk',
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
          complex_ord: 'complex_ord',
        },
      },
    ],
  ],
};
