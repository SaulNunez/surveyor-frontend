import { OdsDocument } from "odf-kit/ods";
import type { OdsCellValue } from "odf-kit/ods";
import type { ExportQuestion, SurveyExportData } from "../services/surveyExportService";

export const ODS_CONTENT_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

const TYPE_LABELS: Record<ExportQuestion['questionType'], string> = {
    'open-ended': 'Open ended',
    'multiple-choice': 'Multiple choice',
    'binary-choice': 'Binary choice',
    'likert-scale': 'Likert scale',
};

function share(count: number, total: number): OdsCellValue {
    return { value: total === 0 ? 0 : count / total, type: 'percentage', numberFormat: 'percentage:1' };
}

/**
 * Builds a two-sheet spreadsheet: "Summary" aggregates each question, and
 * "Responses" lists every completed attempt with one column per question.
 */
export async function buildSurveyOds({ survey, questions, attempts }: SurveyExportData): Promise<Uint8Array> {
    const doc = new OdsDocument();
    doc.setMetadata({ title: `${survey.title} results` });

    const summary = doc.addSheet('Summary');
    summary.setColumnWidth(0, '8cm');
    summary.addRow([survey.title], { bold: true, fontSize: 14 });
    summary.addRow(['Completed responses', attempts.length]);

    questions.forEach((question, index) => {
        summary.addRow([]);
        summary.addRow([`Q${index + 1}. ${question.text}`, TYPE_LABELS[question.questionType]], { bold: true });

        if (question.questionType === 'open-ended') {
            summary.addRow(['Responses', question.answered]);
            return;
        }

        summary.addRow(['Answer', 'Count', 'Share'], { italic: true });
        for (const row of question.rows) {
            summary.addRow([row.label, row.count, share(row.count, question.answered)]);
        }
        if (question.questionType === 'likert-scale') {
            summary.addRow([
                'Average',
                question.average === null ? null : { value: question.average, type: 'float', numberFormat: 'decimal:2' },
            ], { bold: true });
        }
    });

    const sheet = doc.addSheet('Responses');
    sheet.addRow(['Attempt ID', 'Started at', 'Completed at', ...questions.map(q => q.text)], { bold: true });
    for (const attempt of attempts) {
        sheet.addRow([
            attempt.attemptId,
            attempt.startedAt,
            attempt.completedAt,
            ...questions.map(q => attempt.answers[q.id] ?? null),
        ]);
    }

    return doc.save();
}
