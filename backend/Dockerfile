# ==========================================
# Multi-stage Dockerfile for NestJS Backend
# ==========================================

# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies required by Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build application
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy generated Prisma Client and compiled assets
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy static evidence directory if available
COPY static ./static

EXPOSE 3001

CMD ["sh", "-c", "npm run prisma:migrate && node dist/src/main.js"]
