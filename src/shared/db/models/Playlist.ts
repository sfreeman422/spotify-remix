import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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
  )
  @JoinTable()
  public members!: User[];
}
