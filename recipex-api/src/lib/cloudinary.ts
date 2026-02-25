import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

interface OptimizeImageOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb' | 'pad';
  gravity?: 'auto' | 'center' | 'face';
}

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

export function hasCloudinaryConfig(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

export function optimizeRemoteImageUrl(url: string, options: OptimizeImageOptions = {}): string {
  const normalized = String(url || '').trim();
  if (!normalized) return normalized;

  if (!hasCloudinaryConfig()) {
    return normalized;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return cloudinary.url(normalized, {
    type: 'fetch',
    secure: true,
    transformation: [
      {
        width: options.width || 960,
        height: options.height || 640,
        crop: options.crop || 'fill',
        gravity: options.gravity || 'auto',
        fetch_format: 'auto',
        quality: 'auto',
        dpr: 'auto'
      }
    ]
  });
}

export const uploadRecipeImage = async (base64: string, folder = 'recipex/scans') => {
  if (!hasCloudinaryConfig()) {
    return null;
  }

  const dataUri = `data:image/jpeg;base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 1400, height: 1400, crop: 'limit', fetch_format: 'auto', quality: 'auto' }]
  });

  return result.secure_url;
};
