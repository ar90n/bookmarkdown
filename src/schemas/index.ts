import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  url: z.string().url(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const BundleSchema = z.object({
  name: z.string(),
  bookmarks: z.array(BookmarkSchema),
});

export const CategorySchema = z.object({
  name: z.string(),
  bundles: z.array(BundleSchema),
});

export const RootSchema = z.object({
  version: z.literal(1),
  categories: z.array(CategorySchema),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Root = z.infer<typeof RootSchema>;