import { QuestionDao } from "../models/frontend/question";
import { BinaryChoiceQuestion, LikertScaleQuestion, MultipleChoiceQuestion, OpenEndedQuestion } from "../models/questionSchema";
import { Survey, SurveyModel } from "../models/surveySchema";

export async function createQuestion(surveyId: string, questionData: QuestionDao) {
    const survey = await SurveyModel.findById(surveyId).exec();
    if(!survey) {
        throw new Error('Survey not found');
    }

    switch(questionData.questionType) {
        case 'multiple-choice':
            survey.questions.push({
                text: questionData.title,
                options: questionData.options
            } as MultipleChoiceQuestion);
            break;
        case 'binary-choice':
            survey.questions.push({
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            } as BinaryChoiceQuestion);
            break;
        case 'likert-scale':
            survey.questions.push({
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            } as LikertScaleQuestion);
            break;
        case 'open-ended':
            survey.questions.push({
                text: questionData.title,
                questionType: 'open-ended'
            } as OpenEndedQuestion);
            break;
        default:
            throw new Error('Invalid question type');
    }

    await survey.save();
}

export async function editQuestion(surveyId: string, questionId: string, questionData: QuestionDao) {
    const survey = await SurveyModel.findById(surveyId).exec();
    if(!survey) {
        throw new Error('Survey not found');
    }

    const question = survey.questions.id(questionId);
    if(!question) {
        throw new Error('Question not found');
    }

    switch(questionData.questionType) {
        case 'multiple-choice':
            question.updateOne({
                text: questionData.title,
                options: questionData.options
            });
            break;
        case 'binary-choice':
            question.updateOne({
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            });
            break;
        case 'likert-scale':
            question.updateOne({
                text: questionData.title,
                positiveLabel: questionData.positiveLabel,
                negativeLabel: questionData.negativeLabel
            });
            break;
        case 'open-ended':
            question.updateOne({
                text: questionData.title,
            });
            break;
        default:
            throw new Error('Invalid question type');
    }

    await survey.save();
}

export async function deleteQuestion(surveyId: string, questionId: string) {
    const survey = await SurveyModel.findById(surveyId).exec();
    if(!survey) {
        throw new Error('Survey not found');
    }

    const question = survey.questions.pull({ _id: questionId });
    if(!question) {
        throw new Error('Question not found');
    }

    question.remove();

    await survey.save();
}