import { BinaryChoiceQuestionDao, LikertScaleQuestionDao, MultipleChoiceQuestionDao, OpenEndedQuestionDao, QuestionInput } from "../models/frontend/question";
import { QuestionType } from "../models/questionSchema";
import { getQuestionById, deleteQuestion as deleteQuestionFromDb, createQuestion as createQuestionInDb, updateQuestion } from "../repositories/questionRepository";
import { getSurveyById } from "../repositories/surveyRepository";

export async function createQuestion(surveyId: string, questionData: QuestionInput) {
    switch (questionData.questionType) {
        case 'multiple-choice':
            return createQuestionInDb(surveyId, {
                questionType: QuestionType.MULTIPLE_CHOICE,
                text: questionData.title,
                options: questionData.options
            });
        case 'binary-choice':
            return createQuestionInDb(surveyId, {
                questionType: QuestionType.BINARY_CHOICE,
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            });
        case 'likert-scale':
            return createQuestionInDb(surveyId, {
                questionType: QuestionType.LIKERT_SCALE,
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            });
        case 'open-ended':
            return createQuestionInDb(surveyId, {
                questionType: QuestionType.OPEN_ENDED,
                text: questionData.title,
            });
        default:
            null;
    }
}

export async function getQuestionsForSurvey(surveyId: string) {
    const survey = await getSurveyById(surveyId);
    if (!survey) {
        throw new Error('Survey not found');
    }

    return survey.questions.map(question => {
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
            null;
        }
    });
}

export async function editQuestion(surveyId: string, questionId: string, questionData: QuestionInput) {
    const question = await getQuestionById(questionId, surveyId);

    if (!question) {
        throw new Error('Question not found');
    }

    if (question.questionType !== questionData.questionType) {
        throw new Error('Question type cannot be changed');
    }

    if(question.questionType === QuestionType.MULTIPLE_CHOICE
        && questionData.questionType === QuestionType.MULTIPLE_CHOICE
    ) {
        question.text = questionData.title;
        question.options = questionData.options;
    }

    if(question.questionType === QuestionType.OPEN_ENDED
        && questionData.questionType === QuestionType.OPEN_ENDED
    ) {
        question.text = questionData.title;
    }

    if(question.questionType === QuestionType.BINARY_CHOICE
        && questionData.questionType === QuestionType.BINARY_CHOICE
    ) {
        question.text = questionData.title;
        question.positiveLabel = questionData.positiveLabel;
        question.negativeLabel = questionData.negativeLabel;
    }
    
    if(question.questionType === QuestionType.LIKERT_SCALE
        && questionData.questionType === QuestionType.LIKERT_SCALE
    ) {
        question.text = questionData.title;
        question.positiveLabel = questionData.positiveLabel;
        question.negativeLabel = questionData.negativeLabel;
    }

    await updateQuestion(surveyId, questionId, question);
}

export async function deleteQuestion(surveyId: string, questionId: string) {
    return await deleteQuestionFromDb(questionId, surveyId);
}