FROM node:18-alpine

# Installing libvips-dev for sharp image processing
RUN apk add --no-cache vips-dev

# Set up the working directory
WORKDIR /opt/app

# Copy all project files first to give context to yarn workspaces
COPY . .

# Enable Corepack to use the correct Yarn version
RUN corepack enable

# Install dependencies using the recommended flag for CI
RUN yarn install --immutable

# Build the application
RUN yarn build

# Expose the port Strapi runs on
EXPOSE 1337

# Start the application
CMD ["yarn", "start"]
