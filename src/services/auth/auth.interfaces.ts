import { User } from '../../shared/db/models/User';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  user?: User;
}
