FROM node:18
   WORKDIR /app
   COPY telegram-sender/package.json ./
   RUN npm install
   COPY telegram-sender/ .
   RUN mkdir -p prisma
   COPY prisma/schema.prisma prisma/
   RUN npx prisma generate --schema=prisma/schema.prisma
   RUN ls -la /app # Для отладки
   CMD ["node", "index.js"]