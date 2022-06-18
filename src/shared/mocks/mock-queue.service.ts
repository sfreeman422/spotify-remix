import { QueueService } from '../services/queue.service';

export const mockQueueService: QueueService = ({
  state: {},
  queue: jest.fn(),
  dequeue: jest.fn(),
} as unknown) as QueueService;
