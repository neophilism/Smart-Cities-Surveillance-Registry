FROM node:24-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000

RUN npm install --global pnpm@12.7.0
COPY . .
RUN pnpm install --no-frozen-lockfile --allow-build=unrs-resolver
RUN pnpm build
ENV NODE_ENV=production

EXPOSE 10000
CMD ["sh", "-c", "if [ -z \"${DATABASE_URL_UNPOOLED:-}\" ]; then echo >&2 \"DATABASE_URL_UNPOOLED is required for session-safe migrations\"; exit 1; fi; DATABASE_URL=\"$DATABASE_URL_UNPOOLED\" pnpm db:migrate && DATABASE_URL=\"$DATABASE_URL_UNPOOLED\" pnpm db:bootstrap-config && exec pnpm --filter @smart-cities-surveillance-registry/web exec next start --hostname 0.0.0.0 --port ${PORT:-10000}"]
