FROM node:24-trixie-slim

# 7z (zip + 7z) et 7zip-rar (support RAR, section non-free) pour lister/extraire les archives de modèles.
RUN sed -i 's/^Components: main$/Components: main non-free/' /etc/apt/sources.list.d/debian.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends 7zip 7zip-rar \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    LANG=C.UTF-8 \
    MODELS_ROOT=/data/models \
    THUMBNAILS_ROOT=/cache/thumbnails \
    EXTRACT_ROOT=/cache/extract

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src

RUN mkdir -p /cache/thumbnails /cache/extract && chown -R node:node /cache
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
