# Use Node.js Alpine image for smaller size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building - skip prepare script
RUN npm install --ignore-scripts

# Copy source files
COPY . .

# Build the TypeScript project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Start the MCP server
CMD ["node", "build/index.js"]