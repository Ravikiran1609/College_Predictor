# college-predictor-frontend/Dockerfile

# 1) Build stage: build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json & (if present) package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all source files
COPY public ./public
COPY src    ./src

# Build the React app; output goes into /app/build
RUN npm run build

# 2) Production stage: serve with Nginx
FROM nginx:stable-alpine

# Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React app into the Nginx html folder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy a custom Nginx config (so that calls to /predict, /categories, /branches get proxied)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

