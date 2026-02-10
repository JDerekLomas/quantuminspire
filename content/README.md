# Content structure

- `content/blog/posts.ts`: All blog post data lives here (mirrors `BlogPost` type from `lib/blogTypes.ts`). `lib/blog.ts` is now a thin loader that imports from this file.

If you add new posts, keep the shape consistent with `BlogPost` and let the loader sort by `date`.
