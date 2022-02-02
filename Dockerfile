FROM node:14-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --ignore-scripts=false --verbose sharp
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY ./tourly-cms .

RUN yarn build 

EXPOSE 1337

CMD [ "yarn", "start" ]
