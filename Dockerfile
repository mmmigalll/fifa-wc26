# ---- build stage -----------------------------------------------------------
FROM node:20-alpine AS builder
# openssl + libc6-compat are required by Prisma's query engine on Alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
# DATABASE_URL is not needed at build time — Prisma connects lazily.
RUN npm run build

# ---- runtime stage ----------------------------------------------------------
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat curl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./

EXPOSE 3000

# Create/update tables, then start. `db push` is idempotent.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
