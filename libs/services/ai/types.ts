/**
 * A single provider that can turn a set of open-ended answers into a summary.
 *
 * Kept as an interface so `generateSummaryForQuestion` can be handed a stub in
 * tests and never reach the network.
 */
export interface SummaryProvider {
    /** Provider name, persisted alongside the summary as provenance. */
    readonly name: string;
    /** Concrete model, persisted alongside the summary as provenance. */
    readonly model: string;
    summarize(questionText: string, responses: string[], totalResponseCount: number): Promise<string>;
}
