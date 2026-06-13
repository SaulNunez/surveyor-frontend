import { QuestionDao, QuestionInput } from "../models/frontend/question";
import { db } from "../db";
import { questions, surveys } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function createQuestion(surveyId: string, questionData: QuestionInput) {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (surveyResults.length === 0) {
        throw new Error('Survey not found');
    }

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

export async function editQuestion(surveyId: string, questionId: string, questionData: QuestionDao) {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (surveyResults.length === 0) {
        throw new Error('Survey not found');
    }

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

export async function deleteQuestion(surveyId: string, questionId: string) {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (surveyResults.length === 0) {
        throw new Error('Survey not found');
    }

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

export async function getQuestionsForSurvey(surveyId: string) {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (surveyResults.length === 0) {
        throw new Error('Survey not found');
    }

    const results = await db.select()
        .from(questions)
        .where(eq(questions.surveyId, surveyId));

    return results.map(question => {
        const questionType = question.questionType;
        const base = {
            id: question.id,
            questionType: question.questionType,
            title: question.text,
        };

        if (questionType === 'multiple-choice') {
            return {
                ...base,
                options: question.options || [],
            };
        } else if (questionType === 'binary-choice' || questionType === 'likert-scale') {
            return {
                ...base,
                positiveLabel: question.positiveLabel || '',
                negativeLabel: question.negativeLabel || '',
            };
        } else {
            return base; // open-ended
        }
    });
}