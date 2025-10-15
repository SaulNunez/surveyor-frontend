export interface OpenEndedResponseDao {
    questionId: string;
    questionType: 'open-ended';
    response: string;
}

export interface MultipleChoiceResponseDao {
    questionId: string;
    questionType: 'multiple-choice';
    selectedOptionIndex: number;
}

export interface BinaryChoiceResponseDao {
    questionId: string;
    questionType: 'binary-choice';
    selectedOption: 'positive' | 'negative';
}

export interface LikertScaleResponseDao {
    questionId: string;
    questionType: 'likert-scale';
    selectedValue: number; // Assuming a scale from 1 to 5
}

export type QuestionResponseDao = OpenEndedResponseDao | MultipleChoiceResponseDao | BinaryChoiceResponseDao | LikertScaleResponseDao;