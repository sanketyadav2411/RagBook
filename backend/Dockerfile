FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/uploads

COPY package*.json ./

RUN npm install

COPY . .

RUN npx tsc

EXPOSE 5000

CMD ["node", "dist/server.js"]
