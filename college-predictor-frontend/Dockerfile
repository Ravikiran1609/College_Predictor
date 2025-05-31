################################################################################
# Stage 1: build the React (or other Node‐based) frontend
################################################################################
FROM node:18-alpine AS builder

# 1) Create and switch to /app inside the container
WORKDIR /app

# 2) Copy only package.json (no package-lock.json needed here)
COPY package.json ./

# 3) Install dependencies (npm will generate a package-lock.json automatically)
RUN npm install

# 4) Copy the rest of the front-end source code
COPY . .

# 5) Build the production‐ready static files (this assumes you have a "build" script)
RUN npm run build

################################################################################
# Stage 2: serve the built files using nginx
################################################################################
FROM nginx:1.27-alpine

# 6) Remove the default nginx index (optional but often recommended)
RUN rm -rf /usr/share/nginx/html/*

# 7) Copy the built files from the "builder" stage into nginx's html folder
COPY --from=builder /app/build /usr/share/nginx/html

# 8) Expose port 80 and run nginx in the foreground
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

