# SlotBook - one image for local Docker and Cloud Run (R-02).
# The Express API also serves the built React app, so UI and API share port 3000.
# Build from the repository root:  docker build -t slotbook .
# No secret is copied into the image: DATABASE_URL and SEED_PASSWORD are given at
# run time (Secret Manager on GCP, docker-compose locally). Same design as TokTickIT Lab 5.

# Stage 1: build the web app (tsc + Vite)
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Empty = the web app calls the API on the same URL.
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: install the server and generate the Prisma client
FROM node:24-alpine AS server-build
RUN apk add --no-cache openssl
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate

# Stage 3: runtime
FROM node:24-alpine
RUN apk add --no-cache openssl tzdata
WORKDIR /app/server
ENV NODE_ENV=production \
    TZ=Asia/Bangkok \
    PORT=3000 \
    CLIENT_DIST_DIR=/app/client/dist
# node_modules keeps tsx and the Prisma CLI: the migration job runs
# "prisma migrate deploy" and the seed from this same image.
COPY --from=server-build --chown=node:node /app/server ./
COPY --from=client-build /app/client/dist /app/client/dist
# GET /api/version returns this, to match the deployment with the commit and the CI run.
ARG COMMIT_SHA=local
ENV COMMIT_SHA=$COMMIT_SHA
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/server.ts"]
