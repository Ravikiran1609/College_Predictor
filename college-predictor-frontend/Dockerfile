# college-predictor-frontend/Dockerfile

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1: Build the React app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json & package-lock.json (if it exists)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source files
COPY public ./public
COPY src    ./src

# Build the React app
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2: Serve with Nginx and proxy API to backend
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Remove default files
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our custom Nginx config (proxies API calls to http://backend:8000)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

