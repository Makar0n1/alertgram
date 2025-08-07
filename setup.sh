#!/bin/bash
mkdir -p email-ingestor rule-manager-api notification-processor telegram-sender frontend prisma
echo "FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [\"node\", \"index.js\"]" > email-ingestor/Dockerfile
echo "FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [\"node\", \"index.js\"]" > rule-manager-api/Dockerfile
echo "FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [\"node\", \"index.js\"]" > notification-processor/Dockerfile
echo "FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [\"node\", \"index.js\"]" > telegram-sender/Dockerfile
cp package.json email-ingestor/
cp package.json rule-manager-api/
cp package.json notification-processor/
cp package.json telegram-sender/
npx prisma generate --schema=prisma/schema.prisma