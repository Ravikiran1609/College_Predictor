FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY public/ ./public
COPY src/ ./src

RUN npm run build

# ------------------------------------------------------------------------------
# Serve the build with nginx (or any static‐file server)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Copy your custom nginx config if you have one
# COPY proxy/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

