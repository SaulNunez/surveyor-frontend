import { BinaryChoiceQuestion, LikertScaleQuestion, MultipleChoiceQuestion, OpenEndedQuestion } from "./questionSchema";

export interface Survey {
  title: string,
  description: string,
  createdAt: Date,
  lastUpdated: Date,
  user: string;
  questions: (OpenEndedQuestion | MultipleChoiceQuestion | BinaryChoiceQuestion | LikertScaleQuestion)[]
}