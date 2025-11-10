// Client-side safe Cloudinary utilities
// Server-side operations should use cloudinary-server.ts

const cloudNameEnv = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const DEFAULT_CLOUD_NAME = 'dkwrsd0qc';
const cloudName = cloudNameEnv || DEFAULT_CLOUD_NAME;

export function buildCloudinaryUrl(publicIdOrUrl: string, width = 800, height?: number) {
  // If a full URL is provided, return it as-is. This makes the
  // helper resilient when admins paste a direct Cloudinary URL.
  if (/^https?:\/\//i.test(publicIdOrUrl)) {
    return publicIdOrUrl;
  }

  if (!cloudNameEnv) {
    console.warn('[cloudinary] Using default cloud name fallback');
  }

  const transformation = height
    ? `c_fill,f_auto,q_auto:best,dpr_auto,e_sharpen:50,w_${width},h_${height}`
    : `c_fill,f_auto,q_auto:best,dpr_auto,e_sharpen:50,w_${width}`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicIdOrUrl}`;
}

export function getPlaceholderImage(width = 400, height = 400, text = 'Plant') {
  const fontSize = Math.round(Math.min(width, height) / 8);
  const svg = `\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <rect width="100%" height="100%" fill="#10b981"/>\n  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"\n        font-family="Arial, sans-serif" font-size="${fontSize}" fill="#ffffff" opacity="0.9">${text}</text>\n</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


