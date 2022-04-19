FROM node:13

WORKDIR /usr/src/app
COPY package.json .
RUN npm install --only=prod
COPY . .
RUN npm run build:prod
EXPOSE 3000

CMD ["node", "./dist/index.js"]
