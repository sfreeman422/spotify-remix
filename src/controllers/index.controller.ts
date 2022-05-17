import express from 'express';
import * as path from 'path';
import { authController } from './auth.controller';
import { playlistController } from './playlist.controller';

const indexController = express.Router();

indexController.get('/', (_req, res) => {
  console.log('/ hit');
  console.log('sending', path.join(__dirname, '../html', 'index.html'));
  res.sendFile(path.join(__dirname, '../html', 'index.html'));
});

indexController.get('/dashboard', (_req, res) => {
  console.log('/dashboard hit');
  console.log('sending', path.join(__dirname, '../html', 'dashboard.html'));
  res.sendFile(path.join(__dirname, '../html', 'dashboard.html'));
});

indexController.get('/playlist', (_req, res) => {
  console.log('/playlist hit');
  console.log('sending', path.join(__dirname, '../html', 'subscribe.html'));
  res.sendFile(path.join(__dirname, '../html', 'subscribe.html'));
});

export const controllers = [indexController, authController, playlistController];
