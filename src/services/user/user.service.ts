import { getDataSource } from '../../shared/db/AppDataSource';
import { User } from '../../shared/db/models/User';
// TODO: Add error handling for getDataSource.
export class UserService {
  public async getUser(spotifyId: string): Promise<User | null> {
    return getDataSource().then(dataSource => dataSource.getRepository(User).findOneBy({ spotifyId }));
  }

  public async saveUser(accessToken: string, refreshToken: string, spotifyId: string): Promise<User> {
    const existingUser = await this.getUser(spotifyId);
    if (existingUser) {
      existingUser.accessToken = accessToken;
      existingUser.refreshToken = refreshToken;
      return getDataSource().then(datasource => datasource.getRepository(User).save(existingUser));
    } else {
      const user = new User();
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.spotifyId = spotifyId;
      return getDataSource().then(datasource => datasource.getRepository(User).save(user));
    }
  }
}
