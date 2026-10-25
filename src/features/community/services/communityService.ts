import { createSignal,requireUser } from "@/features/profile/services/profileService";
import type { CommunityAction,CommunityPostState,LibraryAlbum,PublicProfile } from "@/models/library";
import type { ProfileSearchPage } from "@/models/profile";
import { supabase } from "@/shared/lib/supabaseClient";

export async function getCommunitySocial(
  userId: string,
  postIds: string[],
  signal: AbortSignal,
): Promise<CommunityPostState[]> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("get_community_social", { p_post_ids: postIds })
    .abortSignal(AbortSignal.any([signal, createSignal()]));

  if (error) throw error;

  return (data ?? []).map((row) => {
    if (
      row.library_status !== null &&
      row.library_status !== "pending" &&
      row.library_status !== "listened"
    ) {
      throw new Error("INVALID_RESPONSE");
    }

    return { ...row, library_status: row.library_status };
  });
}

export async function getPublicProfile(
  userId: string,
  profileId: string,
  signal: AbortSignal,
): Promise<PublicProfile> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("get_public_profile", { p_profile_id: profileId })
    .abortSignal(AbortSignal.any([signal, createSignal()]))
    .single();

  if (error) throw error;
  if (!data || data.id !== profileId) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return data;
}

export async function setCommunityAction(
  request: CommunityAction,
): Promise<LibraryAlbum | null> {
  await requireUser(request.userId);

  const { data, error } = await supabase
    .rpc("set_community_action", {
      p_action: request.action,
      p_target_id: request.targetId,
      p_active: request.active,
    })
    .abortSignal(createSignal());

  if (error) throw error;
  if (request.action !== "library") return null;

  if (
    !data ||
    data.user_id !== request.userId ||
    (data.status !== "pending" && data.status !== "listened")
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return { ...data, status: data.status };
}

export async function searchPublicProfiles(
  userId: string,
  query: string,
  signal: AbortSignal,
): Promise<ProfileSearchPage> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("search_public_profiles", {
      p_query: query,
      p_limit: 12,
    })
    .abortSignal(AbortSignal.any([signal, createSignal()]));

  if (error) throw error;

  return {
    items: (data ?? []).slice(0, 12),
    hasMore: (data?.length ?? 0) > 12,
  };
}
