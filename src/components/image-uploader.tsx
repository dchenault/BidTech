
"use client";

import { useCallback, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";

import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const acceptedFileTypes: Accept = {
  "image/jpeg": [],
  "image/png": [],
  "image/gif": [],
  "image/webp": [],
};

export function ImageUploader({ value, onChange, disabled }: ImageUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setIsLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          onChange(dataUri);
          setIsLoading(false);
        };
        reader.onerror = () => {
          setIsLoading(false);
          console.error("Error reading file");
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: false,
    disabled,
  });

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(""); // Set value to empty string to signify removal
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-input bg-transparent text-muted-foreground transition-colors hover:border-primary/50",
          isDragActive && "border-primary bg-primary/10",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />

        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : value ? (
          <>
            <Image
              src={value}
              alt="Image preview"
              fill
              className="object-contain rounded-md"
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-full z-10"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove Image</span>
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <UploadCloud className="mb-2 h-8 w-8" />
            <p className="font-semibold">
              {isDragActive ? "Drop image here" : "Drag & drop or click"}
            </p>
            <p className="text-xs">PNG, JPG, GIF up to 2MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
