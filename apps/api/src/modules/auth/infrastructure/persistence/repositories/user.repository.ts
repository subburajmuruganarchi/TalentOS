import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), isDeleted: false })
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  updateLastLogin(id: string): Promise<void> {
    return this.userModel
      .updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } })
      .exec()
      .then(() => undefined);
  }
}
