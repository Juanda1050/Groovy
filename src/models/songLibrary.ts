import type { z } from "zod";

import type {
  songFilterSchema,
  songLibrarySchema,
} from "@/features/library/lib/songLibrarySchemas";

export type SongFilter = z.infer<typeof songFilterSchema>;
export type SongLibraryPage = z.infer<typeof songLibrarySchema>;
export type SongLibraryItem = SongLibraryPage["items"][number];
