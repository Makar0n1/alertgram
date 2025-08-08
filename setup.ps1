# Create directories
New-Item -ItemType Directory -Force -Path email-ingestor, rule-manager-api, notification-processor, telegram-sender, frontend, prisma

# Create Dockerfiles
Set-Content -Path email-ingestor/Dockerfile -Value @"
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
"@
Set-Content -Path rule-manager-api/Dockerfile -Value @"
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
"@
Set-Content -Path notification-processor/Dockerfile -Value @"
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
"@
Set-Content -Path telegram-sender/Dockerfile -Value @"
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
"@

# Copy package.json to service directories
Copy-Item -Path package.json -Destination email-ingestor/
Copy-Item -Path package.json -Destination rule-manager-api/
Copy-Item -Path package.json -Destination notification-processor/
Copy-Item -Path package.json -Destination telegram-sender/

# Run Prisma generate
npx prisma generate --schema=prisma/schema.prisma