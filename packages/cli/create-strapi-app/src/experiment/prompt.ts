import parseToChalk from '../utils/parse-to-chalk';

export const experimentPrompt = {
  introText: `
You’re about to launch your project.

🚀 The {red}Millennium Falcon{/red}:
Create a free Strapi Cloud account — deploy in minutes, get built-in hosting, scaling, and a dashboard made for speed.

Includes a 14-day free trial. {bold}No credit card.{/bold}

🚗 The {blueBright}Landspeeder{/blueBright}:
Spin up your project locally. Full control, full setup, no help from Chewie.

`,
  choices: [
    parseToChalk(`Take the {red}Millennium Falcon{/red} (Login/Sign up)`),
    parseToChalk(`Take a {blueBright}Landspeeder{/blueBright} (Skip)`),
  ],
  message: 'Which way do you want to fly?',
  reference: 'starWars',
};
