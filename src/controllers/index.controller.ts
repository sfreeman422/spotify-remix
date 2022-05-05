import express from 'express';
import * as path from 'path';
import { authController } from './auth.controller';
import { playlistController } from './playlist.controller';

const indexController = express.Router();

indexController.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../html', 'index.html'));
});

indexController.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../html', 'dashboard.html'));
});

export const controllers = [indexController, authController, playlistController];
