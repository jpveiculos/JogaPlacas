# Hydro uses this Dockerfile instead of automatic build detection.
# Keep database operations at runtime, where the app's runtime variables are available.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
