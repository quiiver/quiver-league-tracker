# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=24.6.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js/Prisma"

# Node.js/Prisma app lives here
WORKDIR /app

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

# Ensure development dependencies remain available for the build step
ENV NODE_ENV="development"

# Prepare workspace directories for dependency installation
RUN mkdir -p packages/core packages/cli apps/api apps/web

# Install node modules
COPY package-lock.json package.json ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --include=dev

# Generate Prisma Client
COPY prisma .
RUN npx prisma generate

# Copy application code
COPY . .

# Build application
RUN npm run build --workspaces

# Remove development dependencies from workspaces while keeping root tools like Prisma CLI
RUN npm prune --omit=dev --workspaces --include-workspace-root=false


# Final stage for app image
FROM base

# Set production environment for runtime
ENV NODE_ENV="production"

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application
COPY --from=build /app /app

# Run the API server from the compiled output
WORKDIR /app/apps/api

# Setup sqlite3 on a separate volume
RUN mkdir -p /data
VOLUME /data

# Entrypoint prepares the database.
ENTRYPOINT [ "/app/docker-entrypoint.js" ]

# Start the server by default, this can be overwritten at runtime
EXPOSE 3333
ENV DATABASE_URL="file:///data/sqlite.db"
CMD [ "node", "dist/server.js" ]
