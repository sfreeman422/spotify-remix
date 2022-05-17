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
    if (this.state[key] && this.state[key].length > 0) {
      this.state[key].push(fn);
    } else {
      this.state[key] = [fn];
    }
    console.log('queue for key', key);
    console.log(this.state[key]);
    return this.state[key];
  }

  dequeue(key: string): Promise<void> {
    console.log('dequeueing for key', key);
    if (Object.keys(this.state).includes(key) && this.state[key].length > 0) {
      return this.state[key][0]().then(_ => {
        this.state[key].splice(0, 1);
        return this.dequeue(key);
      });
    }
    return new Promise((resolve, _reject) => {
      delete this.state[key];
      resolve();
    });
  }
}
