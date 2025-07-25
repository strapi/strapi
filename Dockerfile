FROM node:18-alpine

# Installing libvips-dev for sharp image processing
RUN apk add --no-cache vips-dev

# Set up the working directory
WORKDIR /opt/app

# Copy package.json and yarn.lock
COPY ./package.json ./
COPY ./yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Expose the port Strapi runs on
EXPOSE 1337

# Start the application
CMD ["yarn", "start"]
