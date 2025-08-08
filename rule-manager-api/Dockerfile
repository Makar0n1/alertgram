FROM node:18
WORKDIR /app
COPY rule-manager-api/package.json ./
RUN npm install
COPY rule-manager-api/ .
RUN mkdir -p prisma
COPY prisma/schema.prisma prisma/
RUN npx prisma generate --schema=prisma/schema.prisma
CMD ["node", "index.js"]