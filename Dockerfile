FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh

COPY . .

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["npm", "run", "start:dev"]