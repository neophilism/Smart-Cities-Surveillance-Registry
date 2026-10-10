FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000

RUN npm install --global pnpm@12.7.0
COPY . .
RUN pnpm install --no-frozen-lockfile --allow-build=unrs-resolver
RUN pnpm build

EXPOSE 10000
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:bootstrap-config && exec pnpm --filter @smart-cities-surveillance-registry/web exec next start --hostname 0.0.0.0 --port ${PORT:-10000}"]
