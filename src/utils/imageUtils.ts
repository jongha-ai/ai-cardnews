/**
 * Helper to process and optimize image files/blobs into base64 data URLs.
 * Handles high-DPI scaling down to 1600px to protect browser memory and localStorage quotas.
 */
export const processImageBlobToBase64 = (
  blob: Blob,
  maxDimension = 1600,
  quality = 0.92
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult || typeof rawResult !== 'string') {
          reject(new Error('이미지 데이터를 읽지 못했습니다.'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                const optimized = canvas.toDataURL('image/jpeg', quality);
                resolve(optimized);
                return;
              }
            }
            resolve(rawResult);
          } catch (canvasErr) {
            console.warn('Canvas optimization fallback to raw Base64:', canvasErr);
            resolve(rawResult);
          }
        };

        img.onerror = () => {
          // If Image() fails to load, still resolve raw data URL as fallback
          resolve(rawResult);
        };

        img.src = rawResult;
      };

      reader.onerror = (err) => {
        reject(err || new Error('이미지 파일 읽기 실패'));
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
};
