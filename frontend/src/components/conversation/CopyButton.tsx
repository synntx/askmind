import React from "react";
import { CopyIcon, CheckmarkIcon } from "@/icons";

interface CopyButtonProps {
  text: string;
  id: string;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  id,
  copiedId,
  setCopiedId,
}) => {
  const copyToClipboard = (): void => {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = text;
    const plainText = tempElement.textContent || tempElement.innerText || text;

    navigator.clipboard.writeText(plainText).then(
      () => {
        console.log("Text copied to clipboard");
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      },
    );
  };

  const isCopied = copiedId === id;

  return (
    <button
      className="text-muted-foreground hover:text-muted-foreground hover:bg-muted/80 p-1.5 rounded-md"
      onClick={copyToClipboard}
      title={isCopied ? "Copied!" : "Copy message"}
      type="button"
    >
      {isCopied ? (
        <CheckmarkIcon className="stroke-primary" strokeWidth={3} />
      ) : (
        <CopyIcon />
      )}
    </button>
  );
};
