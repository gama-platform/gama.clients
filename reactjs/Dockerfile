FROM node:19-alpine AS builder
#export DOCKER_BUILDKIT=0 &&  docker build . --file Dockerfile --tag gamaweb/ui:alpha 


# Set working directory
WORKDIR /app

# Copy our node module specification
COPY package.json package.json 

# install node modules and build assets
RUN npm install --production

# Copy all files from current directory to working dir in image
# Except the one defined in '.dockerignore'
COPY . .

# Create production build of React App
RUN npm run build

# Choose NGINX as our base Docker image
FROM nginx:alpine

# Set working directory to nginx asset directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf *

# Copy static assets from builder stage
COPY --from=builder /app/build .

# Entry point when Docker container has started
ENTRYPOINT ["nginx", "-g", "daemon off;"]
# # Create app directory
# WORKDIR /usr/src/app

# # Install app dependencies
# # A wildcard is used to ensure both package.json AND package-lock.json are copied
# # where available (npm@5+)
# COPY package.json ./

# RUN npm install

# # Bundle app source
# COPY . .

# RUN npm run build

# RUN npm install -g serve

# RUN rm -rf node_modules
# EXPOSE 3000
# # CMD [ "npm", "run", "ostart" ]

# CMD ["serve", "-s", "build"]
