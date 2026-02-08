import { createImageUpload } from "novel";

const MAX_IMAGE_SIZE_MB = 20;

const onUpload = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Image read failed"));
    };

    reader.onerror = () => {
      reject(new Error("Image read failed"));
    };

    reader.readAsDataURL(file);
  });
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      return false;
    }

    if (file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB) {
      return false;
    }

    return true;
  },
});
