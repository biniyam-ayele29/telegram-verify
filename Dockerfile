# 1. Build Stage
FROM node:22.11.0 AS builder

WORKDIR /app

# Accept environment file argument
ARG ENV_FILE

# Copy package files first
COPY package.json package-lock.json ./

# Install dependencies with npm
RUN npm install --frozen-lockfile

# Install pnpm globally
RUN npm install -g pnpm

# Create .dockerignore on the fly to exclude node_modules
RUN echo "node_modules" > .dockerignore

# Copy application code (explicitly excluding node_modules)
# First copy source files and config
COPY src/ ./src/
# COPY public/ ./public/
# COPY prisma/ ./prisma/
COPY *.ts *.json *.js *.mjs ./
COPY .env* ./

# Apply environment variables if provided
RUN if [ -n "$ENV_FILE" ]; then cat $ENV_FILE > .env; fi

# Generate Prisma client
# RUN npx prisma generate

# Build the application with pnpm
RUN pnpm run build

# 2. Production Stage
FROM node:22.11.0-alpine AS runner
WORKDIR /app

# Only copy necessary files for production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/.env* ./

# Install production dependencies only
RUN npm install --only=production

EXPOSE 3000

CMD ["npx", "next", "start"]