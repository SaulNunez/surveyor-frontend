import { Trans } from "@lingui/react/macro";

export function ServerError() {
  return (
    <div className="flex items-center justify-center h-screen bg-red-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          <Trans>Server Error</Trans>
        </h1>
        <p className="text-gray-700 mb-4">
          <Trans>
            An unexpected error occurred while trying to fetch data from the server.
          </Trans>
        </p>
        <p className="text-sm text-gray-500">
          <Trans>
            Please try again later or contact support if the issue persists.
          </Trans>
        </p>
      </div>
    </div>
  );
}
