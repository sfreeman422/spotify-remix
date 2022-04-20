import { getDataSource } from '../../shared/db/AppDataSource';
import { User } from '../../shared/db/models/User';

export class AuthService {
  public saveUser(token: string, spotifyId: string): Promise<User> {
    const user = new User();
    user.authToken = token;
    user.spotifyId = spotifyId;
    return getDataSource()
      .getRepository(User)
      .save(user);
  }
}
