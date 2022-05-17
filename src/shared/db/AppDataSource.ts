import { DataSource } from 'typeorm';
import * as path from 'path';

let AppDataSource: Promise<DataSource>;

export const getDataSource = async (): Promise<DataSource> => {
  if (!(process.env.TYPEORM_HOST && process.env.TYPEORM_USERNAME && process.env.TYPEORM_PASSWORD)) {
    throw new Error('Missing TypeORM Environment Variables!');
  } else if (AppDataSource) {
    return AppDataSource;
  } else {
    AppDataSource = new DataSource({
      type: 'mysql',
      host: process.env.TYPEORM_HOST,
      username: process.env.TYPEORM_USERNAME,
      password: process.env.TYPEORM_PASSWORD,
      database: 'spotifyRemixDB',
      entities: [path.join(__dirname, 'models', '*.ts')],
      synchronize: true,
    }).initialize();
    return AppDataSource;
  }
};
