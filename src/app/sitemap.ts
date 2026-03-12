import fs from 'fs';
import path from 'path';
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const docsDir = path.join(process.cwd(), 'public', 'docs');
  const files = fs.readdirSync(docsDir);
  const baseUrl = 'https://thenullline.vercel.app'; // Replace with actual domain

  const docs = files.map((file) => ({
    url: `${baseUrl}/docs/${encodeURIComponent(file)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    ...docs,
  ];
}
