import { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { getDataSource } from '../../shared/db/AppDataSource';
import { Playlist } from '../../shared/db/models/Playlist';
import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
import { SongWithUserData } from '../spotify/spotify.interface';
import { sub } from 'date-fns';
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

  public async getUserWithRelations(options: FindManyOptions<User>): Promise<User | undefined> {
    return getDataSource()
      .then(datasource => datasource.getRepository(User).find(options))
      .then(user => (user?.length ? user[0] : undefined));
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
      const user = await datasource.getRepository(User).find({ where: { accessToken }, relations: ['ownedPlaylists'] });
      if (user?.[0]?.ownedPlaylists?.length) {
        return user[0].ownedPlaylists;
      }
      return [];
    });
  }
  public async getPlaylist(playlistId: string): Promise<Playlist | undefined> {
    const start = sub(new Date(), { years: 1 });
    const end = sub(new Date(), { days: 6 });

    return getDataSource().then(datasource =>
      datasource
        .getRepository(Playlist)
        .find({
          where: { playlistId },
          relations: ['members', 'history', 'owner'],
        })
        .then(res => res?.[0])
        .then(playlist => ({
          ...playlist,
          history: playlist.history.filter(song => {
            const songDate = new Date(song.createdAt);
            return songDate >= start && songDate <= end;
          }),
        }))
        .catch(e => {
          throw new Error(e);
        }),
    );
  }

  public deletePlaylist(playlists: Playlist[]): Promise<Playlist[]> {
    if (!playlists.length) {
      throw new Error('Unable to delete playlist. No playlist exists with that id');
    }
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

  public saveSongs(playlist: Playlist, songsWithUserData: SongWithUserData[]): Promise<Playlist> {
    return getDataSource().then(ds => {
      const songs = songsWithUserData.map(x => {
        const song = new Song();
        song.playlist = playlist;
        song.spotifyUrl = x.uri;
        song.userId = x.spotifyId;
        song.title = x.name;
        song.artist = x.artists.map(x => x.name).join(', ');
        song.album = x.album.name;
        return song;
      });

      const history = playlist.history.map(x => x);
      const newHistory = history.concat(songs);

      const updatedPlaylist = Object.assign(playlist, { history: newHistory });

      return ds.getRepository(Playlist).save(updatedPlaylist);
    });
  }

  public getPlaylistHistory(playlistId: string): Promise<Song[]> {
    return getDataSource()
      .then(ds => ds.getRepository(Playlist).find({ where: { playlistId }, relations: ['history'] }))
      .then(x =>
        x ? x[0].history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [],
      );
  }
}
