import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Song } from './Song';
import { User } from './User';

@Entity()
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date;

  @Column()
  public playlistId!: string;

  @ManyToOne(
    () => User,
    user => user.ownedPlaylists,
  )
  public owner!: User;

  @ManyToMany(
    () => User,
    user => user.memberPlaylists,
    { cascade: true },
  )
  @JoinTable()
  public members!: User[];

  @OneToMany(
    () => Song,
    song => song.playlist,
    { cascade: true },
  )
  public history!: Song[];
}
