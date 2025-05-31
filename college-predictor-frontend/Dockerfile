# ----------------------------------------
# 1) Build stage (Node → bundle React)
# ----------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app

# Only copy package.json, since you do not have a package-lock.json
COPY package.json ./

# Install dependencies (this will generate node_modules in the builder)
RUN npm install

# Copy everything else (including src/ and public/)
COPY . .

# Build the React app
RUN npm run build

# ----------------------------------------
# 2) Production stage (nginx → serve build)
# ----------------------------------------
FROM nginx:1.27-alpine

# Copy the static build from the "builder" stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 (nginx default)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

