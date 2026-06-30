import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CandidateStoredFileDocument = HydratedDocument<CandidateStoredFile>;

@Schema({ _id: false })
export class FileStorageMetadata {
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
export class CandidateStoredFile {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, default: 'resume' })
  entityType!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  @Prop({ type: FileStorageMetadata, required: true })
  storage!: FileStorageMetadata;

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

  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateStoredFileSchema =
  SchemaFactory.createForClass(CandidateStoredFile);

CandidateStoredFileSchema.index({
  organizationId: 1,
  entityType: 1,
  entityId: 1,
  isDeleted: 1,
});
CandidateStoredFileSchema.index(
  { organizationId: 1, 'storage.path': 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
