import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Playlist } from './Playlist';

@Entity()
export class Song {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date;

  @ManyToOne(
    () => Playlist,
    playlist => playlist.history,
  )
  public playlist!: Playlist;

  @Column({ type: 'longtext' })
  public spotifyUrl!: string;

  @Column({ type: 'longtext' })
  public userId!: string;

  @Column({ type: 'longtext' })
  public title!: string;

  @Column({ type: 'longtext' })
  public artist!: string;

  @Column({ type: 'longtext' })
  public album!: string;
}
