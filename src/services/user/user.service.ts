import { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { getDataSource } from '../../shared/db/AppDataSource';
import { Playlist } from '../../shared/db/models/Playlist';
import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
// TODO: Add error handling for getDataSource.
export class UserService {
  public async getUser(findOptions: FindOptionsWhere<User> | FindOptionsWhere<User>[]): Promise<User | null> {
    return getDataSource().then(dataSource => dataSource.getRepository(User).findOneBy(findOptions));
  }

  public async saveUser(accessToken: string, refreshToken: string, spotifyId: string): Promise<User> {
    const existingUser = await this.getUser({ spotifyId });
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

  public async getUserWithRelations(options: FindManyOptions<User>): Promise<User[] | undefined> {
    return getDataSource().then(datasource => datasource.getRepository(User).find(options));
  }

  public async updateExistingUser(user: User): Promise<User> {
    return getDataSource().then(datasource => datasource.getRepository(User).save(user));
  }

  public async savePlaylist(user: User, playlistId: string): Promise<Playlist> {
    const playlist = new Playlist();
    playlist.playlistId = playlistId;
    playlist.owner = user;
    playlist.members = [user];
    return getDataSource().then(datasource => datasource.getRepository(Playlist).save(playlist));
  }

  public async getAllOwnedPlaylists(accessToken: string): Promise<Playlist[]> {
    return getDataSource().then(async datasource => {
      const token = accessToken.split(' ')[1];
      const user = await datasource
        .getRepository(User)
        .find({ where: { accessToken: token }, relations: ['ownedPlaylists'] });
      if (user?.[0]?.ownedPlaylists?.length) {
        return user[0].ownedPlaylists;
      }
      return [];
    });
  }
  public async getPlaylist(playlistId: string): Promise<Playlist[]> {
    return getDataSource().then(datasource =>
      datasource.getRepository(Playlist).find({ where: { playlistId }, relations: ['members', 'history', 'owner'] }),
    );
  }

  public deletePlaylist(playlists: Playlist[]): Promise<Playlist[]> {
    return getDataSource().then(async datasource => {
      const songs: Song[] = await datasource
        .getRepository(Song)
        .find({ where: playlists.map(playlist => ({ playlist })) });
      return datasource
        .getRepository(Song)
        .remove(songs)
        .then(_ => datasource.getRepository(Playlist).remove(playlists));
    });
  }

  public updatePlaylistMembers(user: User, playlist: Playlist): Promise<Playlist> {
    return getDataSource().then(db => {
      playlist.members.push(user);
      return db.getRepository(Playlist).save(playlist);
    });
  }

  public saveSong(playlist: Playlist, songUri: string): Promise<Playlist> {
    return getDataSource().then(ds => {
      const song = new Song();
      song.playlist = playlist;
      song.spotifyUrl = songUri;

      const history = playlist.history.map(x => x);
      history.push(song);

      const updatedPlaylist = Object.assign(playlist, { history });

      return ds.getRepository(Playlist).save(updatedPlaylist);
    });
  }
}
