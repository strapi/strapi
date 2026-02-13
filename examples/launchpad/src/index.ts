import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
}

async function uploadFile(strapi: any, filename: string): Promise<any | null> {
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Seed image not found: ${filename}`);
    return null;
  }
  const stats = fs.statSync(filePath);
  try {
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: {},
        files: {
          filepath: filePath,
          originalFilename: filename,
          mimetype: getMimeType(filename),
          size: stats.size,
        },
      });
    return file;
  } catch (err) {
    console.warn(`Failed to upload ${filename}:`, err);
    return null;
  }
}

// Image filename mapping
const IMAGE = {
  // Brand logos
  LOGO_LAUNCHPAD: 'logo_6a13c79c4b.png',
  LOGO_ROCKET_STORY: '9aa0b57268fa4bb2f8b605c5d8b48067_3cea95719a.png',
  LOGO_ASTRO_CONTENT: 'fe031ea8fe069eeaffc144d5f7323fe6_3fd70d3be4.png',
  LOGO_LUNAR_STORIES: '8df6161602638aab6b4fbc0f0f3c3378_d87660fc0e.png',
  LOGO_SPACE_LETTER: '7ee6c51f86a8779f1ac3fb687b305e50_a0b0a22418.png',
  LOGO_STACK_HOLE: '4e6c0d619cb905f30f5207bf770e1224_3976adb1eb.png',
  LOGO_PLANET_WORKER: '6a212f698ee7a5b7fcad6703d90f4cc0_224039d0e6.png',
  LOGO_STAR_KETING: '1c29a4618a32311bcb30f8766f125410_3db99ce60b.png',
  LOGO_COSMO_TRENDS: '8fe214ce0671c82b2dffba3aa6968f38_afa1e9fd29.png',
  // Testimonial avatars
  AVATAR_JANE_DOE: 'jane_f553821308.jpeg',
  AVATAR_ALFRED: 'alfred_7432e6015c.jpeg',
  AVATAR_ALICE: '150_ec0263c9c6.jpeg',
  AVATAR_CARLOS: '150_1_72b31e9d92.jpeg',
  AVATAR_EMILY_CHEN: '150_3_92cafa8276.jpeg',
  AVATAR_DAVID: '150_4_735f9c676c.jpeg',
  AVATAR_SOPHIA: '150_6_6425ed4e29.jpeg',
  // Contact user photos
  USER_JOHN_DOE: 'john_doe_1792821758.jpg',
  USER_ROBERT_JOHNSON: 'robert_johnson_93b45a1112.jpg',
  USER_JANE_SMITH: 'jane_smith_5b7b8e75ef.jpg',
  USER_EMILY_DAVIS: 'enily_davis_44973ee0a0.jpg',
  USER_TYLER_DURDEN: 'tyler_durden_77d84b929a.jpg',
  USER_DORA_MIRTA: 'dora_mirta_fb6c81be88.jpg',
  // Article covers
  ARTICLE_5_REASONS:
    'A_futuristic_scene_showing_digital_content_being_launched_into_space_with_high_tech_satellites_orbiting_Earth_symbolizing_fast_global_content_deliver_1e5ad34267.webp',
  ARTICLE_STRAPI_NEXTJS:
    'A_futuristic_web_development_scene_showing_the_integration_of_a_content_management_system_Strapi_with_a_web_framework_Next_js_On_one_side_a_user_94b9fc7c0d.webp',
  ARTICLE_CASE_STUDY:
    'A_natural_setting_where_a_team_of_professionals_is_launching_a_marketing_campaign_The_scene_shows_a_modern_office_with_large_windows_overlooking_a_ci_165bacb7dd.webp',
  // Product images
  PRODUCT_DASHBOARD: 'dashboard_106c0d6b4b.png',
  PRODUCT_ROCKET_1: 'rocket_1_f4ba43fca0.png',
  PRODUCT_ROCKET_2: 'rocket_2_26370b67c0.png',
  PRODUCT_ROCKET_3: 'rocket_3_9a94bfe837.png',
  PRODUCT_ROCKET_4: 'rocket_4_55fae57ea4.png',
  // SEO meta images
  META_LAUNCH_PAD: 'Launch_Pad_2ce50f287f.jpg',
  META_BLOG: 'Blog_bd35597734.jpg',
  META_PRODUCTS: 'Products_e1d1d2b0bf.jpg',
  META_PRICING: 'Pricing_8c8f61211e.jpg',
  META_CONTACT: 'Contact_ccff6af752.jpg',
  META_FAQ: 'FAQ_576e799607.jpg',
} as const;

async function seed({ strapi }) {
  const pageCount = await strapi.documents('api::page.page').count();
  if (pageCount > 0) {
    return;
  }

  console.log('Seeding launchpad preview data...');

  // --- Upload Images ---
  console.log('Uploading seed images...');
  const img: Record<string, any> = {};
  const allFiles = Object.values(IMAGE);
  for (const filename of allFiles) {
    const file = await uploadFile(strapi, filename);
    if (file) {
      img[filename] = file;
    }
  }
  console.log(`Uploaded ${Object.keys(img).length}/${allFiles.length} images.`);

  // Helper to get uploaded file ID (or undefined if not available)
  const fileId = (key: string) => img[key]?.id;

  // --- Categories ---
  const categoryNames = [
    'rocket',
    'booster',
    'software',
    'dashboard',
    'analytics',
    'control',
    'integration',
    'content',
    'marketing',
  ];
  const categories: Record<string, any> = {};
  for (const name of categoryNames) {
    categories[name] = await strapi.documents('api::category.category').create({
      data: { name },
      status: 'published',
    });
  }

  // --- Logos ---
  const logoData = [
    { company: 'LaunchPad', image: IMAGE.LOGO_LAUNCHPAD },
    { company: 'Rocket Story', image: IMAGE.LOGO_ROCKET_STORY },
    { company: 'AstroContent', image: IMAGE.LOGO_ASTRO_CONTENT },
    { company: 'LunarStories', image: IMAGE.LOGO_LUNAR_STORIES },
    { company: 'SpaceLetter', image: IMAGE.LOGO_SPACE_LETTER },
    { company: 'StackHole', image: IMAGE.LOGO_STACK_HOLE },
    { company: 'PlanetWorker', image: IMAGE.LOGO_PLANET_WORKER },
    { company: 'StarKeting', image: IMAGE.LOGO_STAR_KETING },
    { company: 'CosmoTrends', image: IMAGE.LOGO_COSMO_TRENDS },
  ];
  const logos: any[] = [];
  for (const l of logoData) {
    const logo = await strapi.documents('api::logo.logo').create({
      data: { company: l.company, image: fileId(l.image) },
      status: 'published',
    });
    logos.push(logo);
  }
  const launchpadLogo = logos[0];

  // --- Testimonials ---
  const testimonialData = [
    {
      text: "LaunchPad transformed our content delivery. It's like having a personal space shuttle for our website!",
      user: {
        firstname: 'Jane',
        lastname: 'Doe',
        job: 'Content Manager',
        image: fileId(IMAGE.AVATAR_JANE_DOE),
      },
    },
    {
      text: 'Using LaunchPad is too easy. Our content is delivered at warp speed!',
      user: {
        firstname: 'Alfred',
        lastname: 'Pecker',
        job: 'Developer',
        image: fileId(IMAGE.AVATAR_ALFRED),
      },
    },
    {
      text: 'LaunchPad revolutionized the way we deliver content. The speed and reliability are unmatched, making our campaigns more effective and reaching our audience faster than ever.',
      user: {
        firstname: 'Alice',
        lastname: 'Johnson',
        job: 'Digital Marketer',
        image: fileId(IMAGE.AVATAR_ALICE),
      },
    },
    {
      text: 'Using LaunchPad has been a game-changer for our team. The intuitive interface and powerful features allow us to focus on creating great content while knowing it will be delivered flawlessly.',
      user: {
        firstname: 'Carlos',
        lastname: 'Fernandez',
        job: 'Content Strategist',
        image: fileId(IMAGE.AVATAR_CARLOS),
      },
    },
    {
      text: 'Integrating LaunchPad into our workflow was seamless. The advanced analytics and reporting tools give us valuable insights, helping us to continuously improve our content strategy.',
      user: {
        firstname: 'Emily',
        lastname: 'Chen',
        job: 'Web Developer',
        image: fileId(IMAGE.AVATAR_EMILY_CHEN),
      },
    },
    {
      text: 'With LaunchPad, our content reaches our audience without delay. The real-time tracking and performance monitoring have significantly enhanced our SEO efforts, resulting in better search rankings.',
      user: {
        firstname: 'David',
        lastname: 'Lee',
        job: 'SEO Specialist',
        image: fileId(IMAGE.AVATAR_DAVID),
      },
    },
    {
      text: 'LaunchPad provides the reliability and efficiency we need for our product updates. The team collaboration tools and priority support ensure smooth launches every time, keeping our users informed and engaged.',
      user: {
        firstname: 'Sophia',
        lastname: 'Martinez',
        job: 'Product Manager',
        image: fileId(IMAGE.AVATAR_SOPHIA),
      },
    },
  ];
  const testimonials: any[] = [];
  for (const t of testimonialData) {
    const testimonial = await strapi.documents('api::testimonial.testimonial').create({
      data: t,
      status: 'published',
      locale: 'en',
    });
    testimonials.push(testimonial);
  }

  // --- FAQs ---
  const faqData = [
    {
      question: 'What is LaunchPad',
      answer:
        'LaunchPad is a content delivery solution that uses advanced technology to send your web content into orbit, ensuring fast and reliable delivery to your audience.',
    },
    {
      question: 'How do I get started with LaunchPad?',
      answer:
        'Getting started is easy! Simply sign up for an account, choose your plan, buy some additional features or not, prepare your content, and launch it using our intuitive mission control dashboard.',
    },
    {
      question: 'What are the different pricing plans available?',
      answer:
        'We offer four pricing plans: Starter Shuttle ($100/launch), Pro Rocket ($3,000/launch), Team Explorer ($15,000/launch), and Enterprise Shuttle (Contact us for pricing). Each plan comes with its own set of features to suit different needs.',
    },
    {
      question: 'What happens if I exceed the content item limit for my plan?',
      answer:
        'If you exceed the content item limit for your plan, you will need to upgrade to a higher plan or purchase additional launches to accommodate your content.',
    },
    {
      question: 'Is there a way to track the performance of my launched content?',
      answer:
        'Yes, all our plans include analytics features that allow you to track the performance of your launched content. Higher-tier plans offer more advanced analytics and reporting options.',
    },
    {
      question: 'What support options are available if I encounter issues?',
      answer:
        'We offer priority support for Pro Rocket, Team Explorer, and Enterprise Shuttle plans. For other plans, standard support is available via our help center and email.',
    },
    {
      question: 'Can I integrate LaunchPad with other tools and platforms?',
      answer:
        'Yes, LaunchPad supports integration with various third-party tools and platforms. Our Enterprise Integration Kit offers customizable integration options for complex needs.',
    },
  ];
  for (const faq of faqData) {
    await strapi.documents('api::faq.faq').create({
      data: faq,
      status: 'published',
      locale: 'en',
    });
  }

  // --- Products ---
  const productData = [
    {
      name: 'Content Rocket Booster',
      price: 1500,
      slug: 'content-rocket-booster',
      featured: true,
      description:
        'Enhance the speed and performance of your content delivery with our Rocket Booster. Perfect for high-traffic websites needing rapid deployment.',
      images: [fileId(IMAGE.PRODUCT_ROCKET_1), fileId(IMAGE.PRODUCT_ROCKET_2)].filter(Boolean),
      perks: [
        { text: 'Increases delivery speed by 50%' },
        { text: 'Optimized for heavy content loads' },
        { text: 'Easy integration with existing payloads' },
      ],
    },
    {
      name: 'Payload Manager Pro',
      price: 2000,
      slug: 'payload-manager-pro',
      featured: true,
      description:
        'Streamline your content organization and management with the Payload Manager Pro. Ideal for teams handling large volumes of content.',
      images: [fileId(IMAGE.PRODUCT_ROCKET_3), fileId(IMAGE.PRODUCT_ROCKET_4)].filter(Boolean),
      perks: [
        { text: 'Advanced content organization tools' },
        { text: 'Collaborative workspace' },
        { text: 'Real-time updates and tracking' },
      ],
    },
    {
      name: 'Analytics Insight Pack',
      price: 750,
      slug: 'analytics-insight-pack',
      featured: true,
      description:
        'Gain deeper insights into your content performance with the Analytics Insight Pack. Provides comprehensive analytics and reporting features.',
      images: [fileId(IMAGE.PRODUCT_DASHBOARD)].filter(Boolean),
      perks: [
        { text: 'Detailed performance reports' },
        { text: 'Customizable analytics dashboard' },
        { text: 'Integration with third-party analytics tools' },
      ],
    },
    {
      name: 'Mission Control Plus',
      price: 3000,
      slug: 'mission-control-plus',
      featured: false,
      description:
        'Upgrade your control center with Mission Control Plus. Offers enhanced monitoring and management features for your content launches.',
      images: [fileId(IMAGE.PRODUCT_ROCKET_1)].filter(Boolean),
      perks: [
        { text: 'Advanced monitoring tools' },
        { text: 'Real-time status updates' },
        { text: 'Automated alerts and notifications' },
      ],
    },
    {
      name: 'Enterprise Integration Kit',
      price: 8000,
      slug: 'enterprise-integration-kit',
      featured: false,
      description:
        'Seamlessly integrate LaunchPad with your existing enterprise systems using the Enterprise Integration Kit. Designed for large organizations with complex needs.',
      images: [fileId(IMAGE.PRODUCT_ROCKET_3)].filter(Boolean),
      perks: [
        { text: 'Customizable integration options' },
        { text: 'Support for multiple platforms and services' },
        { text: 'Dedicated integration support' },
      ],
    },
  ];
  const products: any[] = [];
  for (const p of productData) {
    const product = await strapi.documents('api::product.product').create({
      data: {
        ...p,
        dynamic_zone: [
          {
            __component: 'dynamic-zone.related-products',
            heading: 'Related Products',
            sub_heading: 'You might be interested by these products',
          },
        ],
      },
      status: 'published',
    });
    products.push(product);
  }

  // --- Plans ---
  const planData = [
    {
      name: 'Starter Shuttle',
      price: 100,
      sub_text: 'launch',
      featured: false,
      CTA: { text: 'Get Started', variant: 'primary' },
      perks: [
        { text: 'Launch up to 1,000 content items' },
        { text: 'Basic Mission Control Dashboard' },
        { text: 'Standard Delivery' },
        { text: 'Basic analytics' },
      ],
      additional_perks: [],
    },
    {
      name: 'Pro Rocket',
      price: 3000,
      sub_text: 'launch',
      featured: false,
      CTA: { text: 'Get Started', variant: 'primary' },
      perks: [
        { text: 'Launch up to 100,000 content items' },
        { text: 'Advanced Mission Control Dashboard' },
        { text: 'High Speed Delivery' },
        { text: 'Advanced analytics' },
        { text: 'Priority Support' },
      ],
      additional_perks: [{ text: 'Everything included from Starter Shuttle' }],
    },
    {
      name: 'Team Explorer',
      price: 15000,
      sub_text: 'launch',
      featured: true,
      CTA: { text: 'Get Started', variant: 'primary' },
      perks: [
        { text: 'Launch up to 1,000,000 content items' },
        { text: 'Collaborative Mission Control Dashboard' },
        { text: 'High-Speed Delivery' },
        { text: 'Advanced analytics and reporting' },
        { text: 'Priority Support' },
        { text: 'Team collaboration tools' },
      ],
      additional_perks: [
        { text: 'Everything included from Starter Shuttle' },
        { text: 'Everything included from Pro Rocket' },
      ],
    },
    {
      name: 'Enterprise Shuttle',
      price: null,
      sub_text: '',
      featured: false,
      CTA: { text: 'Contact us', variant: 'primary' },
      perks: [
        { text: 'Unlimited content items per launch' },
        { text: 'Customizable Mission Control Dashboard' },
        { text: 'Ultra-Speed Delivery' },
        { text: 'Comprehensive analytics and reporting' },
        { text: 'Dedicated Support Team' },
        { text: 'Custom Integrations and Solutions' },
      ],
      additional_perks: [
        { text: 'Everything included from Starter Shuttle' },
        { text: 'Everything included from Pro Rocket' },
        { text: 'Everything included from Team Explorer' },
      ],
    },
  ];
  const plans: any[] = [];
  for (const plan of planData) {
    const created = await strapi.documents('api::plan.plan').create({
      data: plan,
      status: 'published',
    });
    plans.push(created);
  }

  // --- Redirections ---
  await strapi.documents('api::redirection.redirection').create({
    data: { source: '/i-have-a-question', destination: '/faq' },
    status: 'published',
  });
  await strapi.documents('api::redirection.redirection').create({
    data: { source: '/producs', destination: '/products' },
    status: 'published',
  });

  // --- Articles ---
  const articleData = [
    {
      title: '5 Reasons Why Your Content Needs to Go Orbital',
      slug: '5-reasons-why-your-content-needs-to-go-orbital',
      description:
        'Discover the top five benefits of launching your content into orbit with LaunchPad, including faster delivery and unmatched scalability.',
      image: fileId(IMAGE.ARTICLE_5_REASONS),
      content: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: "In today's digital landscape, the speed at which your content reaches your audience can make all the difference. With LaunchPad, your content delivery is not just fast -- it's orbital.",
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Faster Delivery Speeds' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'LaunchPad uses cutting-edge technology to deliver your web content at unprecedented speeds. By leveraging a global network of satellites, we ensure your content reaches users in record time.',
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Unmatched Scalability' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: "Whether you're a small startup or a large enterprise, LaunchPad scales with your needs. Our flexible payload plans accommodate any volume of content, ensuring you never run out of space.",
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Global Reach' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'With our satellite network, your content can reach audiences anywhere in the world. No more worrying about geographic limitations -- LaunchPad brings your content to the farthest corners of the globe.',
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Enhanced Security' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Security is a top priority at LaunchPad. Our content delivery infrastructure is built with the latest security protocols, ensuring your data is protected at all times.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'Future-Proof Technology' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'LaunchPad is continuously evolving. Our team of engineers is always working on new features and improvements to keep you ahead of the curve. Invest in LaunchPad today and future-proof your content delivery strategy.',
            },
          ],
        },
      ],
    },
    {
      title: 'Not a Guide to Integrating Strapi with Next.js',
      slug: 'not-a-guide-to-integrating-strapi-with-next-js',
      description:
        'Looking to streamline your content management and delivery? This guide walks you through integrating Strapi with Next.js.',
      image: fileId(IMAGE.ARTICLE_STRAPI_NEXTJS),
      content: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Integrating Strapi with Next.js can significantly enhance your content management and delivery workflow. This guide provides a step-by-step approach to getting started.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'Step 1: Setting Up Strapi' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'First, set up your Strapi instance. Strapi provides a flexible, open-source headless CMS that allows you to manage your content with ease.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'Step 2: Configuring Next.js' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Next, configure your Next.js application. Next.js is a powerful React framework that enables server-side rendering and static site generation.',
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Step 3: Fetching Data' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'With both Strapi and Next.js set up, you can start fetching data from your Strapi API and displaying it in your Next.js application.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'Step 4: Advanced Configurations' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Explore advanced configurations such as dynamic routing, SEO optimization, and performance tuning to get the most out of your Strapi and Next.js integration.',
            },
          ],
        },
      ],
    },
    {
      title: 'Case Study: How AstroContent Launched Their Marketing to New Heights',
      slug: 'case-study-how-astro-content-launched-their-marketing-to-new-heights',
      description:
        'In this case study, we explore how AstroContent leveraged OrbitExpress to transform their content delivery strategy.',
      image: fileId(IMAGE.ARTICLE_CASE_STUDY),
      content: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'AstroContent, a rapidly growing digital marketing agency, faced significant challenges with their content delivery. They needed a solution that could keep up with their expanding client base and increasing content volumes.',
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'The Challenge' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'AstroContent struggled with slow content delivery speeds, limited scalability, and a lack of real-time analytics. These issues were hindering their ability to deliver timely and effective marketing campaigns.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'The Solution: LaunchPad' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'By implementing LaunchPad, AstroContent was able to overcome these challenges. LaunchPad provided them with rocket-fast delivery, scalable payloads, and comprehensive analytics.',
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'The Results' }] },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'Within just three months, AstroContent saw a 60% increase in content delivery speed, a 40% boost in client satisfaction, and a significant improvement in their marketing campaign effectiveness.',
            },
          ],
        },
      ],
    },
  ];
  for (const article of articleData) {
    await strapi.documents('api::article.article').create({
      data: {
        ...article,
        dynamic_zone: [
          {
            __component: 'dynamic-zone.related-articles',
            heading: 'Some other interesting read',
          },
        ],
      },
      status: 'published',
      locale: 'en',
    });
  }

  // --- Global ---
  await strapi.documents('api::global.global').create({
    data: {
      seo: {
        metaTitle: 'LaunchPad - Deliver Your Content into Orbit',
        metaDescription:
          'LaunchPad is the ultimate solution for delivering content at warp speed. Explore how our advanced technology launches your digital assets into space, making sure they reach your audience faster and more reliably.',
        metaImage: fileId(IMAGE.META_LAUNCH_PAD),
      },
      navbar: {
        logo: launchpadLogo.documentId,
        left_navbar_items: [
          { text: 'Pricing', URL: '/pricing' },
          { text: 'Products', URL: '/products' },
          { text: 'Blog', URL: '/blog' },
          { text: 'Contact', URL: '/contact' },
          { text: 'FAQ', URL: '/faq' },
        ],
        right_navbar_items: [
          { text: 'Book a demo', URL: '/contact' },
          { text: 'Sign up', URL: '/sign-up' },
        ],
      },
      footer: {
        logo: launchpadLogo.documentId,
        description:
          'LaunchPad is a rapid content delivery platform that helps you deliver content to your users in a fast and efficient way.',
        copyright: 'Copyright (c) 2024 Strapi INC',
        designed_developed_by: 'Designed and Developed by Strapi & Aceternity',
        built_with:
          'built with Strapi, Next.js, Tailwind CSS, Framer Motion, Aceternity UI, and icons8',
        internal_links: [
          { text: 'Pricing', URL: '/pricing' },
          { text: 'Blog', URL: '/blog' },
          { text: 'Products', URL: '/products' },
          { text: 'FAQ', URL: '/faq' },
          { text: 'Contact', URL: '/contact' },
          { text: 'Sign up', URL: '/sign-up' },
        ],
        policy_links: [
          { text: 'Privacy Policy', URL: '/' },
          { text: 'Terms of Service', URL: '/' },
          { text: 'Refund Policy', URL: '/' },
        ],
        social_media_links: [
          { text: 'X', URL: 'https://x.com/strapijs', target: '_blank' },
          { text: 'LinkedIn', URL: 'https://linkedin.com/strapi', target: '_blank' },
          { text: 'GitHub', URL: 'https://github.com/strapi/launchpad', target: '_blank' },
        ],
      },
    },
    status: 'published',
    locale: 'en',
  });

  // --- Pages ---

  // Homepage
  await strapi.documents('api::page.page').create({
    data: {
      slug: 'homepage',
      seo: {
        metaTitle: 'LaunchPad - Deliver Your Content into Orbit',
        metaDescription: 'LaunchPad is the ultimate solution for delivering content at warp speed.',
        metaImage: fileId(IMAGE.META_LAUNCH_PAD),
      },
      dynamic_zone: [
        {
          __component: 'dynamic-zone.hero',
          heading: 'Launch your content into orbit',
          sub_heading:
            'Deliver your web content at warp speed with LaunchPad. Our cutting-edge technology ensures your site reaches your audience faster and more reliably than ever before.',
          CTAs: [
            { text: 'Get Started', URL: '/sign-up', variant: 'primary' },
            { text: 'Know more', URL: '#features', variant: 'simple' },
          ],
        },
        {
          __component: 'dynamic-zone.features',
          heading: 'Features to Propel Your Content',
          sub_heading:
            'LaunchPad offers a variety of features designed to boost the speed, scalability, and reliability of your web content delivery.',
          globe_card: {
            title: 'Speedy Delivery',
            description: 'Rocket-fast content delivery with LaunchPad.',
            span: 'two',
          },
          ray_card: {
            title: 'Scalable Payloads',
            description: 'Flexible payload sizes to fit any content volume.',
            span: 'one',
            before_ray_items: {
              item_1: '2,052 Satellites',
              item_2: '8,561,035 Starlinks',
              item_3: '7,581 Rockets',
            },
            after_ray_items: {
              item_1: '2,052 Satellites',
              item_2: '8,561,035 Starlinks',
              item_3: '7,581 Rockets',
            },
          },
          graph_card: {
            title: 'Mission Control Dashboard',
            description: 'Monitor and manage your content launches.',
            highlighted_text: '+8,008 launched',
            span: 'one',
            top_items: [
              { number: '6,092', text: 'Last Month' },
              { number: '72K', text: 'Modules delivered' },
            ],
          },
          social_media_card: {
            Title: 'Interstellar Integration',
            Description: 'Seamless integration with popular tools and services.',
            span: 'two',
          },
        },
        {
          __component: 'dynamic-zone.testimonials',
          heading: 'What Our Users Say',
          sub_heading: 'Hear from our satisfied users about their experience with LaunchPad.',
          testimonials: { connect: testimonials.map((t) => ({ documentId: t.documentId })) },
        },
        {
          __component: 'dynamic-zone.how-it-works',
          heading: 'How LaunchPad works',
          sub_heading:
            "Discover LaunchPad's innovative system for content delivery. Follow the four easy steps to launch your content into orbit.",
          steps: [
            {
              title: 'Plan your Mission',
              description: 'Choose your payload plan and schedule your launch.',
            },
            {
              title: 'Prepare your Payload',
              description:
                'Organize and prepare your content for a smooth launch with our intuitive tools.',
            },
            {
              title: 'Launch your Content',
              description:
                'Send your content into orbit with a single click from our mission control dashboard.',
            },
            {
              title: 'Monitor',
              description:
                "Track your content's journey in real-time and ensure successful delivery to your audience.",
            },
          ],
        },
        {
          __component: 'dynamic-zone.brands',
          heading: 'Trusted by Leading Brands',
          sub_heading: 'LaunchPad is trusted by fortune 500 space organizations.',
          logos: { connect: logos.map((l) => ({ documentId: l.documentId })) },
        },
        {
          __component: 'dynamic-zone.pricing',
          heading: 'Pricing',
          sub_heading: 'Choose your payload.',
          plans: { connect: plans.map((p) => ({ documentId: p.documentId })) },
        },
        {
          __component: 'dynamic-zone.launches',
          heading: 'Recent Launches',
          sub_heading: 'Our latest launches that made it to the universe.',
          launches: [
            {
              mission_number: 'Mission #102',
              title: 'Successfully delivered blog posts to WebOrbit',
              description:
                'Our cutting-edge content delivery system launched a series of blog posts for WebOrbit, ensuring they reached their audience at warp speed.',
            },
            {
              mission_number: 'Mission #101',
              title: 'Launched product updates for SpaceTech',
              description:
                'We were able to launch product updates for SpaceTech, ensuring a smooth and timely delivery.',
            },
            {
              mission_number: 'Mission #100',
              title: 'Sent marketing content to AstroContent.',
              description:
                'AstroContent is by far the fastest growing content delivery platform in the universe.',
            },
          ],
        },
        {
          __component: 'dynamic-zone.cta',
          heading: 'Ready to Launch Your Content?',
          sub_heading: 'Join LaunchPad and start delivering your web content at warp speed.',
          CTAs: [
            { text: 'Book a demo', URL: '/contact', variant: 'muted' },
            { text: 'Sign up now', URL: '/sign-up', variant: 'primary' },
          ],
        },
      ],
    },
    status: 'published',
    locale: 'en',
  });

  // Pricing page
  await strapi.documents('api::page.page').create({
    data: {
      slug: 'pricing',
      seo: {
        metaTitle: 'Pricing Plans - LaunchPad Content Delivery Solutions',
        metaDescription: 'Choose the right plan for your content delivery needs with LaunchPad.',
        metaImage: fileId(IMAGE.META_PRICING),
      },
      dynamic_zone: [
        {
          __component: 'dynamic-zone.pricing',
          heading: 'Pricing',
          sub_heading: 'Choose your payload.',
          plans: { connect: plans.map((p) => ({ documentId: p.documentId })) },
        },
        {
          __component: 'dynamic-zone.brands',
          heading: 'Trusted by Leading Brands',
          sub_heading: 'LaunchPad is trusted by fortune 500 space organizations.',
          logos: { connect: logos.map((l) => ({ documentId: l.documentId })) },
        },
        {
          __component: 'dynamic-zone.cta',
          heading: 'Ready to Launch Your Content?',
          sub_heading: 'Join LaunchPad and start delivering your web content at warp speed.',
          CTAs: [
            { text: 'Book a demo', URL: '/contact', variant: 'muted' },
            { text: 'Sign up now', URL: '/sign-up', variant: 'primary' },
          ],
        },
      ],
    },
    status: 'published',
    locale: 'en',
  });

  // Contact page
  await strapi.documents('api::page.page').create({
    data: {
      slug: 'contact',
      seo: {
        metaTitle: 'Contact Us - LaunchPad Support and Inquiries',
        metaDescription: 'Get in touch with the LaunchPad team for support, demos, and inquiries.',
        metaImage: fileId(IMAGE.META_CONTACT),
      },
      dynamic_zone: [
        {
          __component: 'dynamic-zone.form-next-to-section',
          heading: 'Contact Us',
          sub_heading: 'Please reach out to us and we will get back to you at the speed of light.',
          form: {
            inputs: [
              { type: 'text', name: 'Full Name', placeholder: 'Manu Arora' },
              { type: 'email', name: 'Email address', placeholder: 'hello@strapi.io' },
              { type: 'text', name: 'Company', placeholder: 'Strapi' },
              {
                type: 'textarea',
                name: 'Message',
                placeholder: 'Enter your message here',
              },
              { type: 'submit', name: 'Submit', placeholder: '' },
            ],
          },
          section: {
            heading: 'LaunchPad is trusted by thousands of Astropreneurs',
            sub_heading:
              'Join the ranks of successful entrepreneurs who have launched their content into orbit.',
            users: [
              {
                firstname: 'John',
                lastname: 'Doe',
                job: 'Software Engineer',
                image: fileId(IMAGE.USER_JOHN_DOE),
              },
              {
                firstname: 'Robert',
                lastname: 'Johnson',
                job: 'Product Manager',
                image: fileId(IMAGE.USER_ROBERT_JOHNSON),
              },
              {
                firstname: 'Jane',
                lastname: 'Smith',
                job: 'Data Scientist',
                image: fileId(IMAGE.USER_JANE_SMITH),
              },
              {
                firstname: 'Emily',
                lastname: 'Davis',
                job: 'UX Designer',
                image: fileId(IMAGE.USER_EMILY_DAVIS),
              },
              {
                firstname: 'Tyler',
                lastname: 'Durden',
                job: 'Soap Developer',
                image: fileId(IMAGE.USER_TYLER_DURDEN),
              },
              {
                firstname: 'Dora',
                lastname: 'Mirta',
                job: 'Explorer',
                image: fileId(IMAGE.USER_DORA_MIRTA),
              },
            ],
          },
        },
      ],
    },
    status: 'published',
    locale: 'en',
  });

  // FAQ page
  await strapi.documents('api::page.page').create({
    data: {
      slug: 'faq',
      seo: {
        metaTitle: 'Frequently Asked Questions - LaunchPad',
        metaDescription: 'Find answers to common questions about LaunchPad content delivery.',
        metaImage: fileId(IMAGE.META_FAQ),
      },
      dynamic_zone: [
        {
          __component: 'dynamic-zone.faq',
          heading: 'Frequently Asked Questions',
        },
        {
          __component: 'dynamic-zone.cta',
          heading: 'Ready to Launch Your Content?',
          sub_heading: 'Join LaunchPad and start delivering your web content at warp speed.',
          CTAs: [
            { text: 'Book a demo', URL: '/contact', target: '_blank', variant: 'simple' },
            { text: 'Sign up now', URL: '/sign-up', variant: 'primary' },
          ],
        },
      ],
    },
    status: 'published',
    locale: 'en',
  });

  // --- Blog Page (single type) ---
  await strapi.documents('api::blog-page.blog-page').create({
    data: {
      heading: 'Blog',
      sub_heading: '',
      seo: {
        metaTitle: 'LaunchPad Blog - Tips and Insights on Content Delivery',
        metaDescription:
          'Stay updated with the latest tips, trends, and case studies on content management and delivery.',
        metaImage: fileId(IMAGE.META_BLOG),
      },
    },
    locale: 'en',
  });

  // --- Product Page (single type) ---
  await strapi.documents('api::product-page.product-page').create({
    data: {
      heading: 'Products',
      sub_heading: 'Buy products to supercharge your journey',
      seo: {
        metaTitle: 'Explore Our Products - LaunchPad Content Solutions',
        metaDescription:
          'Discover our range of innovative products designed to enhance your content delivery experience.',
        metaImage: fileId(IMAGE.META_PRODUCTS),
      },
    },
    locale: 'en',
  });

  // --- Public Permissions ---
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (publicRole) {
    const contentTypes = [
      'api::page.page',
      'api::article.article',
      'api::product.product',
      'api::global.global',
      'api::blog-page.blog-page',
      'api::product-page.product-page',
      'api::category.category',
      'api::faq.faq',
      'api::logo.logo',
      'api::plan.plan',
      'api::testimonial.testimonial',
      'api::redirection.redirection',
    ];

    for (const contentType of contentTypes) {
      for (const action of ['find', 'findOne']) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            action: `${contentType}.${action}`,
            role: publicRole.id,
            enabled: true,
          },
        });
      }
    }
  }

  console.log('Seeding complete!');
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }) {
    await seed({ strapi });
  },
};
