
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string;
  onChange: (dataUri: string) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
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
          setPreview(dataUri);
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange("");
  };

  if (isLoading) {
    return (
        <div className="flex h-64 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
            <Loader2 className="mb-4 h-12 w-12 animate-spin" />
            <p>Processing image...</p>
        </div>
    );
  }

  if (preview) {
    return (
      <div className="relative h-64 w-full rounded-md border-2 border-dashed border-gray-300">
        <Image
          src={preview}
          alt="Image preview"
          layout="fill"
          objectFit="contain"
          className="rounded-md"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={handleRemoveImage}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600",
        isDragActive && "border-primary bg-primary/10 text-primary"
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mb-4 h-12 w-12" />
      <p className="font-semibold">
        {isDragActive
          ? "Drop the image here..."
          : "Drag & drop an image here, or click to select"}
      </p>
      <p className="text-xs">PNG, JPG, GIF up to 1MB</p>
    </div>
  );
}
