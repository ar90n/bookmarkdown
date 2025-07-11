import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  url: z.string().url(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  metadata: z.object({
    lastModified: z.string(),
    lastSynced: z.string().optional(),
    isDeleted: z.boolean().optional(),
  }).optional(),
});

export const BundleSchema = z.object({
  name: z.string(),
  bookmarks: z.array(BookmarkSchema),
  metadata: z.object({
    lastModified: z.string(),
    lastSynced: z.string().optional(),
    isDeleted: z.boolean().optional(),
  }).optional(),
});

export const CategorySchema = z.object({
  name: z.string(),
  bundles: z.array(BundleSchema),
  metadata: z.object({
    lastModified: z.string(),
    lastSynced: z.string().optional(),
    isDeleted: z.boolean().optional(),
  }).optional(),
});

export const RootSchema = z.object({
  version: z.literal(1),
  categories: z.array(CategorySchema),
  metadata: z.object({
    lastModified: z.string(),
    lastSynced: z.string().optional(), // Optional since it's set during parse, not from YAML
  }).optional(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Root = z.infer<typeof RootSchema>;