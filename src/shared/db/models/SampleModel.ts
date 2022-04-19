import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SampleModel {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date;
}
