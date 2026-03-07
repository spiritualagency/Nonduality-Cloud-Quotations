FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ libc6-compat openssl

# Copy package files
COPY package*.json ./
# Ensure all dependencies are installed
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Push DB schema
RUN npx prisma db push

# Build the frontend
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

# Use the direct path to tsx to ensure it's found
CMD ["node_modules/.bin/tsx", "server.ts"]
