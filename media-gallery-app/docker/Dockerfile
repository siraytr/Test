FROM node:20-alpine

WORKDIR /usr/src/app

COPY server/package.json server/package-lock.json ./server/
WORKDIR /usr/src/app/server
RUN npm ci --production

WORKDIR /usr/src/app
COPY . .

WORKDIR /usr/src/app/server
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
