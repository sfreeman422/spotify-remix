import 'reflect-metadata'; // Necessary for TypeORM entities.
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import { createConnection, getConnectionOptions } from 'typeorm';
import { controllers } from './controllers/index.controller';
import axios from 'axios';
import axiosRetry from 'axios-retry';

const app: Application = express();
const PORT = process.env.PORT || 3000;

if (!process.env.PRODUCTION) {
  dotenv.config();
}

app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(bodyParser.json());
app.use(controllers);

axiosRetry(axios, {
  retries: 10,
  retryDelay: retryCount => retryCount * 2000,
  retryCondition: err => (err?.response?.status ? err?.response?.status >= 403 : false),
});
// Retry logic interceptor
// axios.interceptors.response.use(undefined, error => {
//   console.error(error.response);
//   if (error.config && error.response && error.response.status === 401) {
//     // This should handle 401 errors by refreshing our users token.
//     // return updateToken().then((token) => {
//     //   error.config.headers.xxxx <= set the token
//     //   return axios.request(config);
//     // });
//   } else if (error.config && error.response && error.response.status > 403) {
//     return setTimeout(() => axios.request(error.config), 2000);
//   }

//   return Promise.reject(error);
// });

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
  e ? console.error(e) : console.log('Listening on port 3000');
  connectToDb();
});
