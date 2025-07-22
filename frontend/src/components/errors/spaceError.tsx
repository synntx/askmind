import { AppError } from "@/types/errors";
import { AxiosError } from "axios";
import { RefreshCcw } from "lucide-react";
import React from "react";

interface SpaceErrorProps {
  err: AxiosError<AppError>;
}

const SpaceError: React.FC<SpaceErrorProps> = ({ err }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-4 text-red-500">
          Error Loading Spaces
        </h3>
        <p className="text-gray-400 mb-6">
          {err?.response?.data?.error.message ||
            err.message ||
            "An error occurred while fetching spaces"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-muted hover:bg-muted/50 border border-border transition-all duration-150 px-4 py-1.5 rounded-lg active:scale-[0.95] ease-in-out mx-auto"
        >
          <RefreshCcw className="size-4" />
          Try Again
        </button>
      </div>
    </div>
  );
};

export default SpaceError;
