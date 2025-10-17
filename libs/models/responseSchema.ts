import * as typegoose from "@typegoose/typegoose";
import { Question, QuestionType } from "./questionSchema";
import { Attempt } from "./attemptSchema";
import { v4 as uuidv4 } from 'uuid';

@typegoose.modelOptions({
  schemaOptions: {
    discriminatorKey: 'responseType',
  },
})
export class Response {
    @typegoose.prop({ required: true, default: () => uuidv4() })
    public _id!: string;

    @typegoose.prop({ ref: () => Question, required: true, type: () => String })
    public question!: typegoose.Ref<Question, string>;

    @typegoose.prop({ required: true })
    public responseType!: string;
}

export const ResponseModel = typegoose.getModelForClass(Response);

export class OpenEndedResponse extends Response {
    @typegoose.prop({ required: true })
    public response!: string;
}

export const OpenEndedResponseModel = typegoose.getDiscriminatorModelForClass(ResponseModel, OpenEndedResponse, QuestionType.OPEN_ENDED);

export class MultipleChoiceResponse extends Response {
    @typegoose.prop({ required: true })
    public selectedOption!: number;
}
export const MultipleChoiceResponseModel = typegoose.getDiscriminatorModelForClass(ResponseModel, MultipleChoiceResponse, QuestionType.MULTIPLE_CHOICE);

export class BinaryChoiceResponse extends Response {
    @typegoose.prop({ required: true })
    public choice!: boolean;
}
export const BinaryChoiceResponseModel = typegoose.getDiscriminatorModelForClass(ResponseModel, BinaryChoiceResponse, QuestionType.BINARY_CHOICE);

export class LikertScaleResponse extends Response {
    @typegoose.prop({ required: true })
    public rating!: number;
}
export const LikertScaleResponseModel = typegoose.getDiscriminatorModelForClass(ResponseModel, LikertScaleResponse, QuestionType.LIKERT_SCALE);