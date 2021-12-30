// TODO: create the modal to consume create and success content

const layout = {
  contentTypeBuilder: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.CTB.title',
        defaultMessage: 'Build the content structure',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.CTB.cta.title',
          defaultMessage: 'Go to the Content-type Builder',
        },
        type: 'REDIRECT',
        target: '/plugins/content-type-builder',
      },
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.CTB.create.title',
        defaultMessage: 'Create a first Collection-type',
      },
      content: {
        id: 'app.components.GuidedTour.CTB.create.content',
        defaultMessage:
          '<p>Collection-types help you manage several entries, Single-types are suitable to manage only one entry.</p> <p>Ex: For a website, articles would be a Collection type and homepage would be a Single type.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CTB.create.cta.title',
          defaultMessage: 'Build a Collection-type',
        },
        type: 'CLOSE',
      },
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.CTB.success.title',
        defaultMessage: 'Step 1: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.CTB.success.content',
        defaultMessage: '<p>Good going!</p><b>What would you like to share with the world? ⚡️</b>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CTB.success.cta.title',
          defaultMessage: 'Create sample content',
        },
        type: 'REDIRECT',
        target: '/content-manager',
      },
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
          id: 'app.components.GuidedTour.home.CM.cta.title',
          defaultMessage: 'Create sample data',
        },
        type: 'REDIRECT',
        target: '/content-manager',
      },
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.CM.create.title',
        defaultMessage: 'Create sample content',
      },
      content: {
        id: 'app.components.GuidedTour.CM.create.content',
        defaultMessage:
          '<p>Create and manage all the content here in the Content Manager.</p><p>Ex: Taking the blog website example further, one can write an article, save and publish it as they like.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CM.create.ctaTitle',
          defaultMessage: 'Create sample content',
        },
        type: 'CLOSE',
      },
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
    },
  },
  apiTokens: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.apiTokens.title',
        defaultMessage: '🚀 See content in action',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.apiTokens.cta.title',
          defaultMessage: 'Test the API',
        },
        type: 'REDIRECT',
        target: '/content-manager',
      },
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.apiTokens.create.title',
        defaultMessage: 'See content in action',
      },
      content: {
        id: 'app.components.GuidedTour.apiTokens.create.content',
        defaultMessage:
          'Generate an authentication token here and retrieve the content you just created',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.apiTokens.create.cta.title',
          defaultMessage: 'Create sample content',
        },
        type: 'CLOSE',
      },
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.apiTokens.success.title',
        defaultMessage: 'Step 3: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.apiTokens.success.content',
        defaultMessage: 'You successfully finished the guided tour.',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.apiTokens.success.cta.title',
          defaultMessage: 'Go back to homepage',
        },
        type: 'REDIRECT',
        target: '/',
      },
    },
  },
};

export default layout;
