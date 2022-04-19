import express, { Router } from 'express';
import { SampleService } from '../services/sample/sample.service';

export const sampleController: Router = express.Router();

const sampleService = new SampleService();

sampleController.post('/', (req, res) => {
  sampleService.greet(`Hello world! I received ${req.body}`);
  res.send('Hello world!');
});
