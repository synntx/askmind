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
      className="text-muted-foreground hover:text-muted-foreground/60 transition-colors p-1 rounded-full"
      onClick={copyToClipboard}
      title={isCopied ? "Copied!" : "Copy message"}
      type="button"
    >
      {isCopied ? <CheckmarkIcon className="stroke-green-500" /> : <CopyIcon />}
    </button>
  );
};
