export class QueueService {
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }
  private static instance: QueueService;
  private state: Record<string, (() => Promise<any>)[]> = {};

  queue<T>(key: string, fn: () => Promise<T>): (() => Promise<T>)[] {
    if (this.state[key] && this.state[key].length) {
      this.state[key].push(fn);
    } else {
      this.state[key] = [fn];
    }
    console.log(`updated queue for - ${key}`);
    console.log(this.state);
    console.log(this.state[key]);
    return this.state[key];
  }

  dequeue(key: string): Promise<void> {
    console.log('attampting to dequeue for key ', key);
    if (Object.keys(this.state).includes(key) && this.state[key].length) {
      console.log('dequeueing for key', key);
      return this.state[key][0]().then(_ => {
        this.state[key].splice(0, 1);
        return this.dequeue(key);
      });
    }
    return new Promise((resolve, _reject) => {
      console.log('Unable to dequeue due to lack of fn in queue for ', key, 'removing this.state[key]');
      delete this.state[key];
      resolve();
    });
  }
}
