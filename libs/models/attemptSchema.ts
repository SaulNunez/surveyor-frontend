import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse } from "./responseSchema";

export interface Attempt {
  user: string,
  survey: string,
  startedAt: Date,
  completedAt?: Date,
  responses: (OpenEndedResponse | MultipleChoiceResponse | BinaryChoiceResponse | LikertScaleResponse)[],
}