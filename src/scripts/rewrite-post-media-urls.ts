import { config } from 'dotenv';
import dataSource from '../infrastructure/database/data-source';

config({ path: ['.env.local', '.env'] });

function getUploadsBaseUrl(): string {
  const localBase = process.env.STORAGE_LOCAL_BASE_URL?.trim();
  if (localBase) {
    return localBase.replace(/\/+$/, '');
  }

  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${appUrl}/uploads`;
}

function rewriteUrl(url: string, uploadsBaseUrl: string): string {
  const normalized = url.trim();
  const legacyPrefixes = [
    'https://api.grapper.net/posts/',
    'http://api.grapper.net/posts/',
    'https://api.grapper.net/uploads/posts/',
    'http://api.grapper.net/uploads/posts/',
    'http://localhost:3000/posts/',
    'http://127.0.0.1:3001/posts/',
    'http://localhost:3000/uploads/posts/',
    'http://127.0.0.1:3001/uploads/posts/',
  ];

  for (const prefix of legacyPrefixes) {
    if (normalized.startsWith(prefix)) {
      return `${uploadsBaseUrl}/posts/${normalized.slice(prefix.length)}`;
    }
  }

  return normalized;
}

async function main() {
  const uploadsBaseUrl = getUploadsBaseUrl();

  await dataSource.initialize();

  try {
    const posts = await dataSource.query(`SELECT id, media_urls FROM posts WHERE media_urls IS NOT NULL`);
    let updatedPosts = 0;
    let updatedUrls = 0;

    for (const post of posts) {
      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
      const nextMediaUrls = mediaUrls.map((url: unknown) => {
        if (typeof url !== 'string') {
          return url;
        }

        const nextUrl = rewriteUrl(url, uploadsBaseUrl);
        if (nextUrl !== url) {
          updatedUrls++;
        }
        return nextUrl;
      });

      if (JSON.stringify(nextMediaUrls) !== JSON.stringify(mediaUrls)) {
        await dataSource.query(`UPDATE posts SET media_urls = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(nextMediaUrls), post.id]);
        updatedPosts++;
      }
    }

    console.log(`Updated ${updatedPosts} posts and ${updatedUrls} media URLs`);
    console.log(`Uploads base URL: ${uploadsBaseUrl}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Failed to rewrite post media URLs');
  console.error(error);
  process.exit(1);
});
