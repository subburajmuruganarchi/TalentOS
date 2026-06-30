import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DocumentEntityDocument = HydratedDocument<DocumentEntity>;

@Schema({ _id: false })
export class DocumentStorage {
  @Prop({ required: true, default: 'local' })
  provider!: string;

  @Prop({ type: String, default: null })
  bucket!: string | null;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;

  @Prop({ required: true })
  checksum!: string;
}

@Schema({ timestamps: true, collection: 'documents' })
export class DocumentEntity {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, default: 'job_description' })
  entityType!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  @Prop({ type: DocumentStorage, required: true })
  storage!: DocumentStorage;

  @Prop({ required: true })
  originalFilename!: string;

  @Prop({ default: 'active', enum: ['active', 'archived'] })
  status!: string;

  @Prop({ type: Types.ObjectId, required: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  updatedBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  deletedBy!: Types.ObjectId | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const DocumentEntitySchema =
  SchemaFactory.createForClass(DocumentEntity);

DocumentEntitySchema.index({
  organizationId: 1,
  entityType: 1,
  entityId: 1,
  isDeleted: 1,
});
DocumentEntitySchema.index(
  { organizationId: 1, 'storage.path': 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
