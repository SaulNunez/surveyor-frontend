import * as typegoose from "@typegoose/typegoose";
import { Survey } from "./surveySchema";
import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse, Response } from "./responseSchema";
import { v4 as uuidv4 } from 'uuid';

export class Attempt {
  @typegoose.prop({ required: true, default: () => uuidv4() })
  public _id!: string;

  @typegoose.prop({ required: true })
  public user!: typegoose.mongoose.Types.ObjectId;

  @typegoose.prop({ required: true, ref: () => Survey, type: () => String })
  public survey!: typegoose.Ref<Survey, string>;

  @typegoose.prop({ default: Date.now })
  public startedAt!: Date;

  @typegoose.prop()
  public completedAt?: Date;

  @typegoose.prop({ 
    type: Response,
    discriminators: () => [
      OpenEndedResponse, MultipleChoiceResponse, BinaryChoiceResponse, LikertScaleResponse
    ]
   })
  public responses?: Response[];
}

export const AttemptModel = typegoose.getModelForClass(Attempt);