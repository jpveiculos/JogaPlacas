# Hydro uses this Dockerfile instead of automatic build detection.
# Database operations run at runtime, using the real DATABASE_URL from Hydro.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma 7 loads prisma.config.ts during build and requires DATABASE_URL to exist.
# This placeholder is used only for build-time validation/generation; it is not
# persisted as an image ENV and does not replace Hydro's runtime DATABASE_URL.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
