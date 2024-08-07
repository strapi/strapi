const LAYOUT_DATA = {
  contentManager: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.CM.title',
        defaultMessage: '⚡️ Create a first entry',
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
      trackingEvent: 'didClickGuidedTourStep1ContentManager',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.CM.success.title',
        defaultMessage: 'Step 2: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.CM.success-admin.content',
        defaultMessage:
          "<p>Good job! That was easy right? Let's browse the Media Library now.</p><b>🖼️ Upload a Media</b>",
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CM.success-admin.cta.title',
          defaultMessage: 'Go to the Media Library',
        },
        type: 'REDIRECT',
        target: '/plugins/upload',
      },
      trackingEvent: 'didCreateGuidedTourEntry',
    },
  },
  mediaLibrary: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.mediaLibrary.title',
        defaultMessage: '🖼️ Upload your first Media',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.mediaLibrary.cta.title',
          defaultMessage: 'Go to the Media Library',
        },
        type: 'REDIRECT',
        target: '/plugins/upload',
      },
      trackingEvent: 'didClickGuidedTourHomepageMediaLibrary',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.mediaLibrary.create.title',
        defaultMessage: '🖼️ Upload Media',
      },
      content: {
        id: 'app.components.GuidedTour.mediaLibrary.create.content',
        defaultMessage:
          '<p>Upload your first media in the Library. It can be an image, a video, an audio or a document.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.mediaLibrary.create.cta.title',
          defaultMessage: 'Manage Media',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep2MediaLibrary',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.mediaLibrary.success.title',
        defaultMessage: 'Step 2: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.mediaLibrary.success.content',
        defaultMessage: '<p>Awesome, you are a pro! What about customizing your experience?</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.mediaLibrary.success.cta.title',
          defaultMessage: 'Manage your profile',
        },
        type: 'REDIRECT',
        target: '/me',
      },
      trackingEvent: 'didCreateGuidedTourMedia',
    },
  },
  profile: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.profile.title',
        defaultMessage: '⚙️ Customize your experience',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.profile.cta.title',
          defaultMessage: 'Manage your profile',
        },
        type: 'REDIRECT',
        target: '/me',
      },
      trackingEvent: 'didClickGuidedTourHomepageProfile',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.profile.create.title',
        defaultMessage: '⚙️ Customize your experience',
      },
      content: {
        id: 'app.components.GuidedTour.profile.create.content',
        defaultMessage:
          '<p>Customize your profile by changing the interface mode #darkModeForTheWin.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.profile.create.cta.title',
          defaultMessage: 'Manage your profile',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep3Profile',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.profile.success.title',
        defaultMessage: 'Step 3: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.profile.success.content',
        defaultMessage:
          '<p>🎉 Congratulations! You can now invite more users to collaborate with you if you have the permission to add them. Feel free to go back to Light mode, we will not judge your choices...</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.profile.success.cta.title',
          defaultMessage: 'Go back to the homepage',
        },
        type: 'REDIRECT',
        target: '/',
      },
      trackingEvent: 'didUpdateGuidedTourProfile',
    },
  },
  inviteUser: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.users.title',
        defaultMessage: '✉️ Invite a User',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.users.create.cta.title',
          defaultMessage: 'Manage admin users',
        },
        type: 'REDIRECT',
        target: '/settings/users',
      },
      trackingEvent: 'didClickGuidedTourHomepageUsers',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.users.create.title',
        defaultMessage: '✉️ Invite a User',
      },
      content: {
        id: 'app.components.GuidedTour.users.create.content',
        defaultMessage:
          '<p>Create another User in the admin panel to help you manage your content.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.users.create.cta.title',
          defaultMessage: 'Manage admin users',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep4Users',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.users.success.title',
        defaultMessage: 'Step 4: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.users.success.content',
        defaultMessage: '<p>Congratulations! You finished the Guided Tour.</p>',
      },
      trackingEvent: 'didGenerateGuidedTourUsers',
    },
  },
};

const SUPER_ADMIN_LAYOUT_DATA = {
  contentTypeBuilder: {
    home: {
      title: {
        id: 'app.components.GuidedTour.CTB.create.title',
        defaultMessage: '🧠 Create a first Collection type',
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
        defaultMessage: '⚡️ Create a first entry',
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
        id: 'app.components.GuidedTour.CM.success-super-admin.content',
        defaultMessage: '<p>Awesome, you are a pro!</p><b>🚀  See content in action</b>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.CM.success-super-admin.cta.title',
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
        id: 'app.components.GuidedTour.home.apiTokens.title',
        defaultMessage: '🚀 Fetch data from the API',
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
      cta: {
        title: {
          id: 'app.components.GuidedTour.users.create.cta.title',
          defaultMessage: 'Go back to the homepage',
        },
        type: 'REDIRECT',
        target: '/',
      },
      trackingEvent: 'didGenerateGuidedTourApiTokens',
    },
  },
  inviteUser: {
    home: {
      title: {
        id: 'app.components.GuidedTour.home.users.title',
        defaultMessage: '✉️ Invite a User',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.home.users.create.cta.title',
          defaultMessage: 'Manage admin users',
        },
        type: 'REDIRECT',
        target: '/settings/users',
      },
      trackingEvent: 'didClickGuidedTourHomepageUsers',
    },
    create: {
      title: {
        id: 'app.components.GuidedTour.users.create.title',
        defaultMessage: '✉️ Invite a User',
      },
      content: {
        id: 'app.components.GuidedTour.users.create.content',
        defaultMessage:
          '<p>Create another User in the admin panel to help you manage your content.</p>',
      },
      cta: {
        title: {
          id: 'app.components.GuidedTour.users.create.cta.title',
          defaultMessage: 'Manage admin users',
        },
        type: 'CLOSE',
      },
      trackingEvent: 'didClickGuidedTourStep4Users',
    },
    success: {
      title: {
        id: 'app.components.GuidedTour.users.success.title',
        defaultMessage: 'Step 4: Completed ✅',
      },
      content: {
        id: 'app.components.GuidedTour.users.success.content',
        defaultMessage: '<p>Congratulations! You finished the Guided Tour.</p>',
      },
      trackingEvent: 'didGenerateGuidedTourUsers',
    },
  },
};

type TrackingEvents =
  | 'didClickGuidedTourHomepageContentManager'
  | 'didClickGuidedTourStep1ContentManager'
  | 'didCreateGuidedTourEntry'
  | 'didClickGuidedTourHomepageMediaLibrary'
  | 'didClickGuidedTourStep2MediaLibrary'
  | 'didCreateGuidedTourMedia'
  | 'didClickGuidedTourHomepageProfile'
  | 'didClickGuidedTourStep3Profile'
  | 'didUpdateGuidedTourProfile'
  | 'didClickGuidedTourHomepageUsers'
  | 'didClickGuidedTourStep4Users'
  | 'didGenerateGuidedTourUsers'
  | 'didClickGuidedTourHomepageContentTypeBuilder'
  | 'didClickGuidedTourStep1CollectionType'
  | 'didCreateGuidedTourCollectionType'
  | 'didClickGuidedTourHomepageApiTokens'
  | 'didClickGuidedTourStep3ApiTokens'
  | 'didGenerateGuidedTourApiTokens'
  | 'didClickGuidedTourHomepageUsers'
  | 'didClickGuidedTourStep4Users'
  | 'didGenerateGuidedTourUsers'
  | 'didClickGuidedTourHomepageContentManager'
  | 'didClickGuidedTourStep2ContentManager'
  | 'didCreateGuidedTourEntry'
  | 'didClickGuidedTourHomepageApiTokens'
  | 'didClickGuidedTourStep3ApiTokens'
  | 'didGenerateGuidedTourApiTokens'
  | 'didClickGuidedTourHomepageUsers'
  | 'didClickGuidedTourStep4Users'
  | 'didGenerateGuidedTourUsers';

const STATES = {
  IS_DONE: 'IS_DONE',
  IS_ACTIVE: 'IS_ACTIVE',
  IS_NOT_DONE: 'IS_NOT_DONE',
} as const;

interface LayoutData {
  contentManager: object;
  mediaLibrary: object;
  profile: object;
  inviteUser?: object;
}

interface SuperAdminLayoutData {
  contentTypeBuilder: object;
  contentManager: object;
  apiTokens: object;
  inviteUser?: object;
}

type States = keyof typeof STATES;

export { SUPER_ADMIN_LAYOUT_DATA, LAYOUT_DATA, STATES };
export type { SuperAdminLayoutData, LayoutData, States, TrackingEvents };
