export const data = {
  sections: {
    collectionTypes: {
      subjects: [
        {
          subjectId: 'api::category.category',
          label: 'Category',
          actions: [
            {
              label: 'create',
              actionId: 'api-token.create',
            },
            {
              label: 'findOne',
              actionId: 'api-token.findOne',
            },
            {
              label: 'find',
              actionId: 'api-token.find',
            },
            {
              label: 'update',
              actionId: 'api-token.update',
            },
            {
              label: 'delete',
              actionId: 'api-token.delete',
            },
          ],
        },
        {
          subjectId: 'api::country.country',
          label: 'Country',
          actions: [
            {
              label: 'create',
              actionId: 'api-token.create',
            },
            {
              label: 'findOne',
              actionId: 'api-token.findOne',
            },
            {
              label: 'find',
              actionId: 'api-token.find',
            },
            {
              label: 'update',
              actionId: 'api-token.update',
            },
            {
              label: 'delete',
              actionId: 'api-token.delete',
            },
          ],
        },
      ],
    },
    singleTypes: {
      subjects: [
        {
          subjectId: 'api::homepage.homepage',
          label: 'Homepage',
          actions: [
            {
              label: 'create',
              actionId: 'api-token.create',
            },
            {
              label: 'find',
              actionId: 'api-token.find',
            },
            {
              label: 'update',
              actionId: 'api-token.update',
            },
          ],
        },
      ],
    },
    custom: {
      subjects: [
        {
          subjectId: 'api::ticket.ticket',
          label: 'Ticket',
          actions: [
            {
              label: 'getTicket',
              actionId: 'api-token.getTicket',
            },
            {
              label: 'createTicket',
              actionId: 'api-token.createTicket',
            },
          ],
        },
      ],
    },
  },
};
