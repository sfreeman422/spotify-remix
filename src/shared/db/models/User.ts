import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Playlist } from './Playlist';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date;

  @Column({ type: 'longtext' })
  public spotifyId!: string;

  @Column({ type: 'longtext' })
  public accessToken!: string;

  @Column({ type: 'longtext' })
  public refreshToken!: string;

  @OneToMany(
    () => Playlist,
    playlist => playlist.owner,
    {
      cascade: true,
    },
  )
  public ownedPlaylists?: Playlist[];

  @ManyToMany(() => Playlist, { cascade: true })
  @JoinTable()
  public memberPlaylists?: Playlist[];
}
