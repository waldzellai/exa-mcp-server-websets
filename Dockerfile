# Exa Websets MCP Server
# Provides websets management and search capabilities through MCP
# Tools: websets_manager, web_search_exa, websets_guide

# Use the official Node.js 18 image as a parent image
FROM node:18-alpine AS builder

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application code into the container
COPY src/ ./src/
COPY tsconfig.json ./

# Build the project
RUN npm run build

# Use a minimal node image as the base image for running
FROM node:18-alpine AS runner

WORKDIR /app

# Copy compiled code from the builder stage
COPY --from=builder /app/build ./build
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --production --ignore-scripts

# The Exa API key must be provided at runtime
# Example: docker run -e EXA_API_KEY=your-actual-key exa-websets-mcp-server
ENV EXA_API_KEY=""

# Run the MCP server (communicates via stdio, not HTTP)
ENTRYPOINT ["node", "build/index.js"]