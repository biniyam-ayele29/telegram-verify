# Dockerfile

# ---- Builder Stage ----
# Use a Node.js LTS version on Alpine Linux for a smaller base image.
FROM node:20-alpine AS builder
WORKDIR /app

# Add build arguments for environment variables
ARG TELEGRAM_BOT_TOKEN
ARG JWT_SECRET_KEY

# Set environment variables for build time
ENV TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
ENV JWT_SECRET_KEY=$JWT_SECRET_KEY

# Copy env file first
COPY .env .env

# Install dependencies
# Copy package.json and package-lock.json (if available) first
# to leverage Docker cache for dependencies.
COPY package.json ./
# If you have a package-lock.json, uncomment the next line
# COPY package-lock.json ./
# If you use yarn, copy yarn.lock and use 'yarn install --frozen-lockfile'
# If you use pnpm, copy pnpm-lock.yaml and use 'pnpm install --frozen-lockfile'
RUN npm install

# Copy the rest of the application source code.
# Ensure .dockerignore is properly set up to exclude unnecessary files.
COPY . .

# Build the Next.js application.
# The 'output: standalone' in next.config.ts is crucial for this step.
RUN npm run build

# ---- Runner Stage ----
# Use a Node.js LTS version on Alpine Linux for the final image.
FROM node:20-alpine AS runner
WORKDIR /app

# Add runtime environment variables
ENV NODE_ENV=production
ENV TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
ENV JWT_SECRET_KEY=$JWT_SECRET_KEY

# The PORT environment variable will be picked up by Next.js.
# You can set it to a default here or override it when running the container.
# ENV PORT=3000

# Copy env file to runtime
COPY --from=builder /app/.env .env

# Copy the standalone output from the builder stage.
# This includes the minimal server, node_modules, and other necessary files.
COPY --from=builder /app/.next/standalone ./

# Copy the static assets and public folder.
COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/public ./public

# Expose the port the Next.js app will run on.
# This should match the PORT environment variable (default 3000 for Next.js).
EXPOSE 3000

# Command to run the Next.js application.
# 'server.js' is the entry point created by the 'output: standalone' build.
CMD ["node", "server.js"]