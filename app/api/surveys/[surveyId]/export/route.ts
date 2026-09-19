import { auth } from "@/auth";
import { getSurveyExportData } from "@/libs/services/surveyExportService";
import { buildSurveyOds, ODS_CONTENT_TYPE } from "@/libs/export/surveyOds";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";

function contentDisposition(title: string) {
    const asciiName = title
        .normalize("NFKD")
        .replace(/[^\x20-\x7e]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "survey";
    const utf8Name = encodeURIComponent(`${title}-results.ods`);
    return `attachment; filename="${asciiName}-results.ods"; filename*=UTF-8''${utf8Name}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;
        const data = await getSurveyExportData(surveyId, session.user.id);
        const file = await buildSurveyOds(data);

        return new Response(Buffer.from(file), {
            status: 200,
            headers: {
                "Content-Type": ODS_CONTENT_TYPE,
                "Content-Disposition": contentDisposition(data.survey.title),
                "Cache-Control": "no-store",
            },
        });
    }
    catch (reason) {
        if (reason instanceof NotFoundError) {
            return new Response(reason.message, { status: 404 });
        }
        const message = reason instanceof Error ? reason.message : 'Unexpected exception';
        return new Response(message, { status: 500 });
    }
}
