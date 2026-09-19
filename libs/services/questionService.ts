import { QuestionDao, QuestionInput } from "../models/frontend/question";
import { db } from "../db";
import { questions } from "../db/schema";
import { resolveSurveyId } from "./surveyService";
import { eq, and } from "drizzle-orm";

export async function createQuestion(surveyPublicId: string, questionData: QuestionInput) {
    const surveyId = await resolveSurveyId(surveyPublicId);

    const insertValues: any = {
        surveyId,
        text: questionData.title,
        questionType: questionData.questionType
    };

    switch(questionData.questionType) {
        case 'multiple-choice':
            insertValues.options = questionData.options;
            break;
        case 'binary-choice':
        case 'likert-scale':
            insertValues.positiveLabel = questionData.positiveLabel;
            insertValues.negativeLabel = questionData.negativeLabel;
            break;
        case 'open-ended':
            break;
        default:
            throw new Error('Invalid question type');
    }

    await db.insert(questions).values(insertValues);
}

export async function editQuestion(surveyPublicId: string, questionId: string, questionData: QuestionInput) {
    const surveyId = await resolveSurveyId(surveyPublicId);

    const questionResults = await db.select()
        .from(questions)
        .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)))
        .limit(1);
    if (questionResults.length === 0) {
        throw new Error('Question not found');
    }

    const updateValues: any = {
        text: questionData.title,
        questionType: questionData.questionType,
        // Reset subclass specific values that might change
        options: null,
        positiveLabel: null,
        negativeLabel: null
    };

    switch(questionData.questionType) {
        case 'multiple-choice':
            updateValues.options = questionData.options;
            break;
        case 'binary-choice':
        case 'likert-scale':
            updateValues.positiveLabel = questionData.positiveLabel;
            updateValues.negativeLabel = questionData.negativeLabel;
            break;
        case 'open-ended':
            break;
        default:
            throw new Error('Invalid question type');
    }

    await db.update(questions)
        .set(updateValues)
        .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)));
}

export async function deleteQuestion(surveyPublicId: string, questionId: string) {
    const surveyId = await resolveSurveyId(surveyPublicId);

    const questionResults = await db.select()
        .from(questions)
        .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)))
        .limit(1);
    if (questionResults.length === 0) {
        throw new Error('Question not found');
    }

    await db.delete(questions)
        .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)));
}

export async function getQuestionsForSurvey(surveyPublicId: string) {
    const surveyId = await resolveSurveyId(surveyPublicId);

    const results = await db.select()
        .from(questions)
        .where(eq(questions.surveyId, surveyId));

    return results.map((question): QuestionDao => {
        const questionType = question.questionType as QuestionDao['questionType'];
        const base = {
            id: question.id,
            title: question.text,
        };

        switch (questionType) {
            case 'multiple-choice':
                return {
                    ...base,
                    questionType,
                    options: question.options || [],
                };
            case 'binary-choice':
            case 'likert-scale':
                return {
                    ...base,
                    questionType,
                    positiveLabel: question.positiveLabel || '',
                    negativeLabel: question.negativeLabel || '',
                };
            default:
                return { ...base, questionType: 'open-ended' };
        }
    });
}