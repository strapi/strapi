import parseToChalk from '../utils/parse-to-chalk';

export const starWarsPrompt = {
  introText: `
You’re about to launch your project.

🚀 The {red}Millennium Falcon{/red}:

Create a free Strapi Cloud account — deploy in minutes, get built-in hosting, scaling, and a dashboard made for speed.
Includes a 14-day hosting free trial. {bold}No credit card.{/bold}

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


export const dunePrompt = {
  introText: `
You’re at the edge of the desert.

🐛 Ride the {yellowBright}Sandworm{/yellowBright}:

Create a free Strapi Cloud account — deploy in minutes, built-in hosting, and effortless scaling.
Includes a 14-day hosting free trial. {bold}No credit card.{/bold}

⛏️ Walk the {magentaBright}Dunes{/magentaBright}:

Start your project locally. Full control, manual setup — the slow path through the sand.

`,
  choices: [
    parseToChalk(`Ride the {yellowBright}Sandworm{/yellowBright} (Login/Sign up)`),
    parseToChalk(`Walk the {magentaBright}Dunes{/magentaBright} (Skip)`),
  ],
  message: 'Choose your journey:',
  reference: 'dune',
};
