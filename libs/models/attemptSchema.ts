import * as typegoose from "@typegoose/typegoose";
import { Survey } from "./surveySchema";
import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse, Response } from "./responseSchema";

export class Attempt {
  @typegoose.prop()
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