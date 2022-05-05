import { DataSource } from 'typeorm';

let AppDataSource: Promise<DataSource>;

export const getDataSource = async (): Promise<DataSource> => {
  if (
    !(
      process.env.TYPEORM_CONNECTION &&
      process.env.TYPEORM_HOST &&
      process.env.TYPEORM_USERNAME &&
      process.env.TYPEORM_PASSWORD &&
      process.env.TYPEORM_DATABASE &&
      process.env.TYPEORM_ENTITIES &&
      process.env.TYPEORM_SYNCHRONIZE
    )
  ) {
    throw new Error('Missing TypeORM Environment Variables!');
  } else if (AppDataSource) {
    return AppDataSource;
  } else {
    AppDataSource = new DataSource({
      type: 'mysql',
      host: process.env.TYPEORM_HOST,
      port: parseInt(process.env.TYPEORM_PORT as string),
      username: process.env.TYPEORM_USERNAME,
      password: process.env.TYPEORM_PASSWORD,
      database: process.env.TYPEORM_DATABASE,
      entities: [process.env.TYPEORM_ENTITIES],
    }).initialize();
    return AppDataSource;
  }
};
