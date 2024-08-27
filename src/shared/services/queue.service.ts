export class QueueService {
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }
  private static instance: QueueService;
  private state: Record<string, (() => Promise<any>)[]> = {};

  getKeys(): string[] {
    return Object.keys(this.state);
  }

  getState(key: string): (() => Promise<any>)[] {
    return this.state[key];
  }

  queue<T>(key: string, fn: () => Promise<T>): (() => Promise<T>)[] {
    if (this.state[key] && this.state[key].length) {
      this.state[key].push(fn);
    } else {
      this.state[key] = [fn];
    }
    console.log(`updated queue for - ${key}`);
    console.log(this.state);
    return this.state[key];
  }

  dequeue(key: string): Promise<void> {
    console.log('Attempting to dequeue for ', key);
    const state = this.getState(key);
    if (state?.length) {
      console.log('Key found, running dequeue function for ', key);
      return state[0]().then(() => {
        state.splice(0, 1);
        return this.dequeue(key);
      });
    }
    return new Promise(resolve => {
      console.log('Unable to dequeue due to lack of fn in queue for ', key, 'removing this.state[key]');
      delete this.state[key];
      resolve();
    });
  }
}
