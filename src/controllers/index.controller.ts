import express from 'express';
import * as path from 'path';
import { authController } from './auth.controller';
import { playlistController } from './playlist.controller';

const indexController = express.Router();

indexController.get('/', (_req, res) => {
  console.log('indexController / route hit');
  res.sendFile(path.join(__dirname, '../html', 'index.html'));
});

indexController.get('/dashboard', (_req, res) => {
  console.log('indexController /dashboard route hit');
  res.sendFile(path.join(__dirname, '../html/pages/dashboard', 'dashboard.html'));
});

indexController.get('/playlist', (_req, res) => {
  console.log('indexController /playlist hit');
  res.sendFile(path.join(__dirname, '../html/pages/subscribe', 'subscribe.html'));
});

indexController.get('/history', (_req, res) => {
  console.log('indexController /history route hit');
  res.sendFile(path.join(__dirname, '../html/pages/history', 'history.html'));
});

indexController.get('/how-it-works', (_req, res) => {
  console.log('indexController /how-it-works route hit');
  res.sendFile(path.join(__dirname, '../html/pages/how-it-works', 'how-it-works.html'));
});

export const controllers = [indexController, authController, playlistController];
