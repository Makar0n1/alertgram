FROM node:18
WORKDIR /app
COPY auth-service/package.json ./
RUN npm install
COPY auth-service/ .
RUN mkdir -p prisma
COPY prisma/schema.prisma prisma/
RUN npx prisma generate --schema=prisma/schema.prisma
CMD ["node", "index.js"]