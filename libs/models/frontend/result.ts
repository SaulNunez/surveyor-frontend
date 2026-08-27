export interface OpenEndedResponseInput {
    questionType: 'open-ended';
    response: string;
}

export interface MultipleChoiceResponseInput {
    questionType: 'multiple-choice';
    selectedOptionIndex: number;
}

export interface BinaryChoiceResponseInput {
    questionType: 'binary-choice';
    selectedOption: 'positive' | 'negative';
}

export interface LikertScaleResponseInput {
    questionType: 'likert-scale';
    selectedValue: number; // Assuming a scale from 1 to 5
}

/**
 * A response as supplied by a caller. The question it belongs to is always
 * passed alongside it, so it is not repeated here.
 */
export type QuestionResponseInput =
    | OpenEndedResponseInput
    | MultipleChoiceResponseInput
    | BinaryChoiceResponseInput
    | LikertScaleResponseInput;

export type OpenEndedResponseDao = OpenEndedResponseInput & { questionId: string };
export type MultipleChoiceResponseDao = MultipleChoiceResponseInput & { questionId: string };
export type BinaryChoiceResponseDao = BinaryChoiceResponseInput & { questionId: string };
export type LikertScaleResponseDao = LikertScaleResponseInput & { questionId: string };

export type QuestionResponseDao = QuestionResponseInput & { questionId: string };
