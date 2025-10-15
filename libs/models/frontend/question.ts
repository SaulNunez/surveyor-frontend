
export interface MultipleChoiceQuestionDao {
    questionType: 'multiple-choice';
    options: string[];
    title: string;
}

export interface BinaryChoiceQuestionDao {
    questionType: 'binary-choice';
    positiveLabel: string;
    negativeLabel: string;
    title: string;
}

export interface LikertScaleQuestionDao {
    questionType: 'likert-scale';
    positiveLabel: string;
    negativeLabel: string;
    title: string;
}

export interface OpenEndedQuestionDao {
    questionType: 'open-ended';
    title: string;
}

export type QuestionDao = MultipleChoiceQuestionDao | BinaryChoiceQuestionDao | LikertScaleQuestionDao | OpenEndedQuestionDao;