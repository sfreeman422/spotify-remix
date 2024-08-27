import { QueueService } from './queue.service';

describe('QueueService', () => {
  let queueService: QueueService;

  beforeEach(() => {
    queueService = QueueService.getInstance();
    queueService.dequeue('test');
  });

  describe('getState', () => {
    it('should return the state for a key', () => {
      const key = 'test';
      const fn = () => Promise.resolve();
      queueService.queue(key, fn);
      expect(queueService.getState(key)).toEqual([fn]);
    });

    it('should return undefined if the key does not exist', () => {
      expect(queueService.getState('test')).toBeUndefined();
    });
  });

  describe('queue', () => {
    it('should add a function to the queue when queue is empty', () => {
      const key = 'test';
      const fn = () => Promise.resolve();
      queueService.queue(key, fn);
      expect(queueService.getState(key)).toEqual([fn]);
    });

    it('should add a function to the queue when queue is not empty', () => {
      const key = 'test';
      const fn1 = () => Promise.resolve();
      const fn2 = () => Promise.resolve();
      queueService.queue(key, fn1);
      queueService.queue(key, fn2);
      expect(queueService.getState(key)).toEqual([fn1, fn2]);
    });
  });

  describe('dequeue', () => {
    it('should remove the first function from the queue and call it, then call subsequent functions', async () => {
      const key = 'test';
      const fn1 = jest.fn(() => Promise.resolve());
      const fn2 = jest.fn(() => Promise.resolve());
      queueService.queue(key, fn1);
      queueService.queue(key, fn2);
      await queueService.dequeue(key);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('should remove the first function from the queue and call it, then remove the next function', async () => {
      const key = 'test';
      const fn1 = jest.fn(() => Promise.resolve());
      const fn2 = jest.fn(() => Promise.resolve());
      queueService.queue(key, fn1);
      queueService.queue(key, fn2);
      await queueService.dequeue(key);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('should remove the first function from the queue and call it, then remove the next function, then remove the key', async () => {
      const key = 'test';
      const fn1 = jest.fn(() => Promise.resolve());
      const fn2 = jest.fn(() => Promise.resolve());
      queueService.queue(key, fn1);
      queueService.queue(key, fn2);
      await queueService.dequeue(key);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      const state = queueService.getState(key);
      console.log(state);
      expect(queueService.getKeys()).toEqual([]);
    });

    it('should remove the key if the queue is empty', async () => {
      const key = 'test';
      await queueService.dequeue(key);
      expect(queueService.getKeys()).toEqual([]);
    });
  });
});
