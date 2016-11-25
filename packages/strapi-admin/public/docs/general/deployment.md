# Deployment

## Heroku

### Easy 5-Step Deployment Process

*Step 1:* Create a Procfile with the following line: `web: npm run start:prod`. We are doing this because heroku runs `npm run start` by default, so we need this setting to override the default run command. 

*Step 2:* Install heroku's buildpack on your heroku app by running the following command: `heroku buildpacks:set https://github.com/heroku/heroku-buildpack-nodejs#v90 -a [your app name]`. Make sure to replace `#v90` with whatever the latest buildpack is which you can [find here](https://github.com/heroku/heroku-buildpack-nodejs/releases).

*Step 3:* Add this line to your Package.json file in the scripts area: `"postinstall": "npm run build:clean",`. This is because Heroku runs this as part of their build process (more of which you can [read about here](https://devcenter.heroku.com/articles/nodejs-support#build-behavior)).

*Step 4:* Run `heroku config:set NPM_CONFIG_PRODUCTION=false` so that Heroku can compile the NPM Modules included in your devDependencies (since many of these packages are required for the build process).

*Step 5:* Follow the standard Heroku deploy process at this point:

1. `git add .`
2. `git commit -m 'Made some epic changes as per usual'`
3. `git push heroku master`
