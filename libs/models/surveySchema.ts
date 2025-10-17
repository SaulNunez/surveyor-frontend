import { DocumentType, getModelForClass, prop } from "@typegoose/typegoose";
import mongoose from "mongoose";
import { BinaryChoiceQuestion, LikertScaleQuestion, MultipleChoiceQuestion, OpenEndedQuestion, Question } from "./questionSchema";
import { v4 as uuidv4 } from 'uuid';

export class Survey {
  @prop({ required: true, default: () => uuidv4() })
  public _id!: string;

  @prop({ required: true })
  public title!: string;

  @prop({ required: true })
  public description!: string;

  @prop({ default: Date.now })
  public createdAt!: Date;

  @prop({ required: true })
  public user!: mongoose.Types.ObjectId;

  @prop({ 
    type: Question,
        discriminators: () => [
          OpenEndedQuestion, MultipleChoiceQuestion, BinaryChoiceQuestion, LikertScaleQuestion
        ]
   })
  public questions!: mongoose.Types.DocumentArray<DocumentType<Question>>;
}
export const SurveyModel = getModelForClass(Survey);