FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS admin-builder
WORKDIR /app/admin-panel
COPY admin-panel/package*.json ./
RUN npm install
COPY admin-panel/ ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
# Install all dependencies for build
RUN npm install
COPY backend/ ./
# Generate Prisma Client
RUN npx prisma generate
RUN npm run build

# Final Production Image
FROM node:22-alpine
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy backend files
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules

# Copy built frontend assets to the locations expected by backend/src/app.ts
# app.ts expects them at ../../admin-panel/dist and ../../frontend/dist relative to backend/dist
COPY --from=admin-builder /app/admin-panel/dist ./admin-panel/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 3000

# Start script
CMD ["npm", "run", "start"]
