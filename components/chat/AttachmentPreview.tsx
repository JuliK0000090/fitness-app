"use client";

import { X, FileText, Film, Mic } from "lucide-react";
import Image from "next/image";

export interface PendingAttachment {
  id: string;
  file: File;
  type: "image" | "document" | "audio" | "video";
  previewUrl?: string;
  uploading?: boolean;
  url?: string;
  transcript?: string;
  documentText?: string;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2">
      {attachments.map((a) => (
        <div key={a.id} className="relative group">
          {a.type === "image" && a.previewUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
              <Image src={a.previewUrl} alt={a.file.name} width={64} height={64} className="object-cover w-full h-full" />
              {a.uploading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border border-border glass flex flex-col items-center justify-center gap-1">
              {a.type === "document" && <FileText size={20} className="text-muted-foreground" />}
              {a.type === "audio" && <Mic size={20} className="text-muted-foreground" />}
              {a.type === "video" && <Film size={20} className="text-muted-foreground" />}
              <span className="text-[9px] text-muted-foreground truncate w-12 text-center">{a.file.name}</span>
            </div>
          )}
          <button
            onClick={() => onRemove(a.id)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={8} />
          </button>
        </div>
      ))}
    </div>
  );
}
