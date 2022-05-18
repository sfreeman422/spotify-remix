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

if (!process.env.PRODUCTION) {
  dotenv.config();
}
const app: Application = express();
const PORT = process.env.PORT ? process.env.PORT : 3000;
const refreshService = RefreshService.getInstance();

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
  if (error.config && error.response && error.response.status === 401) {
    const accessToken = error.config.headers.Authorization.split(' ')[1];
    // This should handle 401 errors by refreshing our users token.
    // Not sure about these return undefined, but a lil drunk rn.
    return refreshService.refresh(accessToken).then((user: User | undefined) => {
      if (user) {
        error.config.headers.authorization = `Bearer ${user.accessToken}`;
        return axios.request(error.config);
      }
      return undefined;
    });
  }

  return Promise.reject(error);
});

axiosRetry(axios, {
  retries: 10,
  retryDelay: retryCount => retryCount * 1000,
  retryCondition: err => (err?.response?.status && err.response.status >= 403) || err?.response?.status === undefined,
});

app.listen(PORT, (e?: Error) => {
  e ? console.error(e) : console.log(`Listening on port ${PORT}`);
  getDataSource()
    .then(_ => console.log('Connected to DB'))
    .catch(e => console.error(e));
});
