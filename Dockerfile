
# Use an official Node.js runtime
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests first
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Application listens on port 3000
EXPOSE 3000

# Start the Node.js API
CMD ["node", "server.js"]
