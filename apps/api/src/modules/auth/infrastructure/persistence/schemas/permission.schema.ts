import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<PermissionEntity>;

@Schema({ timestamps: true, collection: 'permissions' })
export class PermissionEntity {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  resource!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  module!: string;
}

export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);
