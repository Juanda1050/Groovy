import { supabase } from "@/lib/supabaseClient";
import type {
  AvatarUploadInput,
  Profile,
  ProfileInput,
  UserSettings,
} from "@/models/profile";
import type { UpdateLanguageInput } from "@/models/language";

const avatarBucket = "avatars";
const avatarMaxBytes = 128 * 1024;
const avatarUrlLifetime = 60 * 60;
const staleUploadAge = 15 * 60_000;

function createSignal(): AbortSignal {
  return AbortSignal.timeout(12_000);
}

async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function isOwnedAvatarPath(
  userId: string,
  path: string | null,
): path is string {
  return (
    path !== null &&
    path.startsWith(`${userId}/`) &&
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(path)
  );
}

function isDuplicateUpload(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (
    ("statusCode" in error && String(error.statusCode) === "409") ||
    ("status" in error && String(error.status) === "409")
  );
}

async function removeAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(avatarBucket).remove([path]);

  if (error) throw error;
}

async function cleanupStaleAvatars(
  userId: string,
  currentPath: string | null,
  pendingPath: string,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .list(userId, {
      limit: 20,
      sortBy: { column: "created_at", order: "asc" },
    });

  if (error || !data) return;

  const cutoff = Date.now() - staleUploadAge;

  const paths = data.flatMap((object) => {
    const path = `${userId}/${object.name}`;
    const createdAt = Date.parse(object.created_at ?? "");

    if (
      !isOwnedAvatarPath(userId, path) ||
      path === currentPath ||
      path === pendingPath ||
      !Number.isFinite(createdAt) ||
      createdAt >= cutoff
    ) {
      return [];
    }

    return [path];
  });

  if (paths.length > 0) {
    await supabase.storage.from(avatarBucket).remove(paths);
  }
}

export async function getProfile(
  userId: string,
  signal: AbortSignal,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;

  return data;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .rpc("save_profile", {
      p_display_name: input.displayName,
      p_username: input.username,
      p_bio: input.bio,
    })
    .abortSignal(createSignal());

  if (error) throw error;

  return data;
}

export async function getUserSettings(
  userId: string,
  signal: AbortSignal,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, locale")
    .eq("user_id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;

  return data;
}

export async function updateLanguage({
  userId,
  locale,
}: UpdateLanguageInput): Promise<void> {
  const { data, error } = await supabase
    .from("user_settings")
    .update({ locale })
    .eq("user_id", userId)
    .select("user_id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Settings update failed.");
}

export async function getAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .createSignedUrl(path, avatarUrlLifetime);

  if (error) throw error;

  return data.signedUrl;
}

export async function discardProfileAvatar(
  userId: string,
  path: string,
): Promise<Profile> {
  await requireUser(userId);

  const current = await getProfile(userId, createSignal());

  if (current.avatar_url !== path && isOwnedAvatarPath(userId, path)) {
    await removeAvatar(path);
  }

  return current;
}

export async function saveProfileAvatar({
  userId,
  path,
  file,
}: AvatarUploadInput): Promise<Profile> {
  await requireUser(userId);

  if (
    !isOwnedAvatarPath(userId, path) ||
    file.type !== "image/webp" ||
    file.size === 0 ||
    file.size > avatarMaxBytes
  ) {
    throw new Error("AVATAR_INVALID_UPLOAD");
  }

  const previous = await getProfile(userId, createSignal());

  await cleanupStaleAvatars(userId, previous.avatar_url, path).catch(
    () => undefined,
  );

  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(path, file, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError && !isDuplicateUpload(uploadError)) {
    throw uploadError;
  }

  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("save_profile_avatar", {
      p_avatar_path: path,
    })
    .abortSignal(createSignal());

  let saved = data;

  if (error) {
    const recovered = await getProfile(userId, createSignal()).catch(
      () => null,
    );

    if (recovered?.avatar_url !== path) throw error;

    saved = recovered;
  }

  if (!saved || saved.id !== userId || saved.avatar_url !== path) {
    throw new Error("AVATAR_INVALID_RESPONSE");
  }

  const oldPath = previous.avatar_url;

  if (oldPath !== path && isOwnedAvatarPath(userId, oldPath)) {
    await removeAvatar(oldPath).catch(() => undefined);
  }

  return saved;
}
