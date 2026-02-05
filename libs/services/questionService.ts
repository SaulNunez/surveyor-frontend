import { BinaryChoiceQuestionDao, LikertScaleQuestionDao, MultipleChoiceQuestionDao, OpenEndedQuestionDao, QuestionInput } from "../models/frontend/question";
import { QuestionType } from "../models/questionSchema";
import { getQuestionById, deleteQuestion as deleteQuestionFromDb, createQuestion as createQuestionInDb, updateQuestion } from "../repositories/questionRepository";
import { getSurveyById } from "../repositories/surveyRepository";
import { ResultAsync, ok, err, fromPromise } from "neverthrow";

// Helper to convert unknown error to Error
const toError = (e: unknown) => e instanceof Error ? e : new Error(String(e));

export function createQuestion(surveyId: string, questionData: QuestionInput) {
    // switch logic to determine input for repository
    let createPromise;
    switch (questionData.questionType) {
        case 'multiple-choice':
            createPromise = createQuestionInDb(surveyId, {
                questionType: QuestionType.MULTIPLE_CHOICE,
                text: questionData.title,
                options: questionData.options
            });
            break;
        case 'binary-choice':
            createPromise = createQuestionInDb(surveyId, {
                questionType: QuestionType.BINARY_CHOICE,
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            });
            break;
        case 'likert-scale':
            createPromise = createQuestionInDb(surveyId, {
                questionType: QuestionType.LIKERT_SCALE,
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel,
                options: ['1', '2', '3', '4', '5']
            });
            break;
        case 'open-ended':
            createPromise = createQuestionInDb(surveyId, {
                questionType: QuestionType.OPEN_ENDED,
                text: questionData.title,
            });
            break;
        default:
            return err(new Error('Invalid question type'));
    }

    return fromPromise(createPromise, toError);
}

export function getQuestionsForSurvey(surveyId: string) {
    return fromPromise(
        getSurveyById(surveyId),
        toError
    ).andThen(survey => {
        if (!survey) {
            return err(new Error('Survey not found'));
        }

        const questions = survey.questions.map(question => {
            if (question.questionType === QuestionType.BINARY_CHOICE) {
                return {
                    id: question._id,
                    questionType: 'binary-choice',
                    positiveLabel: question.positiveLabel,
                    negativeLabel: question.negativeLabel,
                    title: question.text
                } as BinaryChoiceQuestionDao;
            }
            else if (question.questionType === QuestionType.LIKERT_SCALE) {
                return {
                    id: question._id,
                    questionType: 'likert-scale',
                    positiveLabel: question.positiveLabel,
                    negativeLabel: question.negativeLabel,
                    title: question.text
                } as LikertScaleQuestionDao;
            }
            else if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
                return {
                    id: question._id,
                    questionType: 'multiple-choice',
                    title: question.text,
                    options: question.options
                } as MultipleChoiceQuestionDao;
            }
            else if (question.questionType === QuestionType.OPEN_ENDED) {
                return {
                    id: question._id,
                    questionType: 'open-ended',
                    title: question.text
                } as OpenEndedQuestionDao;
            }
            else {
                return null;
            }
        });
        return ok(questions.filter(q => q !== null) as (BinaryChoiceQuestionDao | LikertScaleQuestionDao | MultipleChoiceQuestionDao | OpenEndedQuestionDao)[]);
    });
}

export function editQuestion(surveyId: string, questionId: string, questionData: QuestionInput) {
    return fromPromise(
        getQuestionById(questionId, surveyId),
        toError
    ).andThen(question => {
        if (!question) {
            return err(new Error('Question not found'));
        }

        if (question.questionType !== questionData.questionType) {
            return err(new Error('Question type cannot be changed'));
        }

        if (question.questionType === QuestionType.MULTIPLE_CHOICE
            && questionData.questionType === QuestionType.MULTIPLE_CHOICE
        ) {
            question.text = questionData.title;
            question.options = questionData.options;
        }

        if (question.questionType === QuestionType.OPEN_ENDED
            && questionData.questionType === QuestionType.OPEN_ENDED
        ) {
            question.text = questionData.title;
        }

        if (question.questionType === QuestionType.BINARY_CHOICE
            && questionData.questionType === QuestionType.BINARY_CHOICE
        ) {
            question.text = questionData.title;
            question.positiveLabel = questionData.positiveLabel;
            question.negativeLabel = questionData.negativeLabel;
        }

        if (question.questionType === QuestionType.LIKERT_SCALE
            && questionData.questionType === QuestionType.LIKERT_SCALE
        ) {
            question.text = questionData.title;
            question.positiveLabel = questionData.positiveLabel;
            question.negativeLabel = questionData.negativeLabel;
        }

        return fromPromise(
            updateQuestion(surveyId, questionId, question),
            toError
        );
    });
}

export function deleteQuestion(surveyId: string, questionId: string) {
    return fromPromise(
        deleteQuestionFromDb(questionId, surveyId),
        toError
    );
}