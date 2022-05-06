import 'reflect-metadata'; // Necessary for TypeORM entities.
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import { createConnection, getConnectionOptions } from 'typeorm';
import { controllers } from './controllers/index.controller';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { AuthService } from './services/auth/auth.service';
import { TokenSet } from './services/auth/auth.interfaces';
import { UserService } from './services/user/user.service';
import { User } from './shared/db/models/User';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const authService = new AuthService();
const userService = new UserService();

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

// Retry logic interceptor
axios.interceptors.response.use(undefined, error => {
  console.log(error.response.status);
  console.log(error.response.data);
  console.log(error.request);
  if (error.config && error.response && error.response.status === 401) {
    console.log('refreshing token..');
    console.log(error.config.headers);
    const accessToken = error.config.headers.Authorization.split(' ')[1];
    // This should handle 401 errors by refreshing our users token.
    // Not sure about these return undefined, but a lil drunk rn.
    return authService
      .refreshToken(accessToken)
      .then((tokens: TokenSet | undefined) => {
        console.log(tokens);
        if (tokens && tokens.user) {
          const updatedUser = tokens.user;
          updatedUser.accessToken = tokens.accessToken;
          updatedUser.refreshToken = tokens.refreshToken;
          return userService.updateExistingUser(updatedUser);
        }
        return undefined;
      })
      .then((user: User | undefined) => {
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
  retryDelay: retryCount => retryCount * 2000,
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
  e ? console.error(e) : console.log('Listening on port 3000');
  connectToDb();
});
