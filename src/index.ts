import 'reflect-metadata'; // Necessary for TypeORM entities.
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import { controllers } from './controllers/index.controller';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { User } from './shared/db/models/User';
import { RefreshService } from './shared/services/refresh.service';
import { getDataSource } from './shared/db/AppDataSource';
import https from 'https';
import fs from 'fs';

if (!process.env.PRODUCTION) {
  dotenv.config();
}
const app: Application = express();
const PORT = process.env.PORT ? process.env.PORT : 3000;
const refreshService = RefreshService.getInstance();

// TODO: Remove this once we are hosting on NGINX.
app.use(express.static(__dirname + '/html'));

app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(bodyParser.json());
app.use(controllers);

// Retry logic interceptor
axios.interceptors.response.use(undefined, error => {
  console.log('HTTP Request Failure:');
  console.log('status: ', error?.response?.status);
  console.log('data: ', error?.response?.data);
  console.log('url: ', error?.config?.url);
  console.log('config.data: ', error?.config?.data);
  console.log(error?.config?.['axios-retry']);
  if (error && error.config && error.response && error.response.status === 401) {
    const accessToken = error.config.headers.Authorization.split(' ')[1];
    return refreshService.refresh(accessToken).then((user: User | undefined) => {
      if (user) {
        error.config.headers.authorization = `Bearer ${user.accessToken}`;
        return axios.request(error.config).then(res => {
          res.data = { ...res.data, accessToken: user.accessToken, refreshToken: user.refreshToken };
          console.log('Refreshed user token, returning');
          console.log(res.data);
          return res;
        });
      } else {
        return Promise.reject('Unable to authenticate user');
      }
    });
  }

  return Promise.reject(error);
});

axiosRetry(axios, {
  retries: 10,
  retryDelay: retryCount => retryCount * 1000,
  retryCondition: err => (err?.response?.status && err.response.status >= 403) || err?.response?.status === undefined,
});

const cert = fs.readFileSync('/etc/letsencrypt/live/remix.lol/fullchain.pem');
const key = fs.readFileSync('/etc/letsencrypt/live/remix.lol/privkey.pem');

https.createServer({ cert, key }, app).listen(443, (e?: Error) => {
  e ? console.error(e) : console.log(`Listening on port ${PORT}`);
  getDataSource()
    .then(_ => console.log('Connected to DB'))
    .catch(e => console.error(e));
});
