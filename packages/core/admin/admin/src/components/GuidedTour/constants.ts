const LAYOUT_DATA = {
  contentTypeBuilder: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.CTB.title',
        defaultMessage: '🧠 Build the content structure',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.CTB.cta.title',
          defaultMessage: 'Go to the Content type Builder',
        },
        type: 'REDIRECT',
        target: '/plugins/content-type-builder',
      },
      trackingEvent: 'didClickGuidedTourHomepageContentTypeBuilder',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.CTB.create.title',
        defaultMessage: '🧠 Create a first Collection type',
      },
      content: {
        id: 'app.components.GuidedTour.CTB.create.content',
        defaultMessage:
          '<p>Collection types help you manage several entries, Single types are suitable to manage only one entry.</p> <p>Ex: For a Blog website, Articles would be a Collection type whereas a Homepage would be a Single type.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CTB.create.cta.title',
          defaultMessage: 'Build a Collection type',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep1CollectionType',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.CTB.success.title',
        defaultMessage: 'Step 1: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.CTB.success.content',
        defaultMessage: '<p>Good going!</p><b>⚡️ What would you like to share with the world?</b>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.create-content',
          defaultMessage: 'Create content',
        },
        type: 'REDIRECT',
        target: '/content-manager',
      },
      trackingEvent: 'didCreateGuidedTourCollectionType',
    },
  },
  contentManager: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.CM.title',
        defaultMessage: '⚡️ What would you like to share with the world?',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.create-content',
          defaultMessage: 'Create content',
        },
        type: 'REDIRECT',
        target: '/content-manager',
      },
      trackingEvent: 'didClickGuidedTourHomepageContentManager',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.CM.create.title',
        defaultMessage: '⚡️ Create content',
      },
      content: {
        id: 'app.components.GuidedTour.CM.create.content',
        defaultMessage:
          "<p>Create and manage all the content here in the Content Manager.</p><p>Ex: Taking the Blog website example further, one can write an Article, save and publish it as they like.</p><p>💡 Quick tip - Don't forget to hit publish on the content you create.</p>",
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.create-content',
          defaultMessage: 'Create content',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep2ContentManager',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.CM.success.title',
        defaultMessage: 'Step 2: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.CM.success.content',
        defaultMessage: '<p>Awesome, one last step to go!</p><b>🚀  See content in action</b>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CM.success.cta.title',
          defaultMessage: 'Test the API',
        },
        type: 'REDIRECT',
        target: '/settings/api-tokens',
      },
      trackingEvent: 'didCreateGuidedTourEntry',
    },
  },
  apiTokens: {
    home: {
      title: {
        id: 'app.components.GuidedTour.apiTokens.create.title',
        defaultMessage: '🚀 See content in action',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.apiTokens.cta.title',
          defaultMessage: 'Test the API',
        },
        type: 'REDIRECT',
        target: '/settings/api-tokens',
      },
      trackingEvent: 'didClickGuidedTourHomepageApiTokens',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.apiTokens.create.title',
        defaultMessage: '🚀 See content in action',
      },
      content: {
        id: 'app.components.GuidedTour.apiTokens.create.content',
        defaultMessage:
          '<p>Generate an authentication token here and retrieve the content you just created.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.apiTokens.create.cta.title',
          defaultMessage: 'Generate an API Token',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep3ApiTokens',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.apiTokens.success.title',
        defaultMessage: 'Step 3: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.apiTokens.success.content',
        defaultMessage:
          "<p>See content in action by making an HTTP request:</p><ul><li><p>To this URL: <light>https://'<'YOUR_DOMAIN'>'/api/'<'YOUR_CT'>'</light></p></li><li><p>With the header: <light>Authorization: bearer '<'YOUR_API_TOKEN'>'</light></p></li></ul><p>For more ways to interact with content, see the <documentationLink>documentation</documentationLink>.</p>",
      },
      trackingEvent: 'didGenerateGuidedTourApiTokens',
    },
  },
} as const;

const STATES = {
  IS_DONE: 'IS_DONE',
  IS_ACTIVE: 'IS_ACTIVE',
  IS_NOT_DONE: 'IS_NOT_DONE',
} as const;

type LayoutData = typeof LAYOUT_DATA;
type States = keyof typeof STATES;

export { LAYOUT_DATA, STATES };
export type { LayoutData, States };
