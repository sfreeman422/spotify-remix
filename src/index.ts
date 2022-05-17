import 'reflect-metadata'; // Necessary for TypeORM entities.
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import { createConnection, getConnectionOptions } from 'typeorm';
import { controllers } from './controllers/index.controller';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { User } from './shared/db/models/User';
import { RefreshService } from './shared/services/refresh.service';

if (!process.env.PRODUCTION) {
  dotenv.config();
}
const app: Application = express();
const PORT = process.env.PORT ? process.env.PORT : 3000;
const refreshService = new RefreshService();

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
  console.log(error?.response?.data);
  console.log(error?.config?.url);
  console.log(error?.config?.data);
  console.log(error?.config?.['axios-retry']);
  if (error.config && error.response && error.response.status === 401) {
    const accessToken = error.config.headers.Authorization.split(' ')[1];
    console.log(`Refreshing token: ${accessToken}`);
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
  retryCondition: err => (err?.response?.status ? err?.response?.status >= 403 : false),
});

const connectToDb = async (): Promise<void> => {
  try {
    const options = await getConnectionOptions();
    createConnection(options)
      .then(connection => {
        if (connection.isConnected) {
          console.log(`Connected to MySQL DB: ${options.database}`);
        } else {
          throw Error('Unable to connect to database');
        }
      })
      .catch(e => console.error(e));
  } catch (e) {
    console.error(e);
  }
};

app.listen(PORT, (e?: Error) => {
  e ? console.error(e) : console.log(`Listening on port ${PORT}`);
  connectToDb();
});
