import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { usePublicProfile } from "@/features/community/hooks/usePublicProfile";
import { ThemeToggle } from "@/features/preferences/components/ThemeToggle";
import { useTheme } from "@/features/preferences/hooks/useTheme";
import { PreferencesSection } from "@/features/preferences/pages/PreferencesSection";
import { UserAvatar } from "@/features/profile/components/UserAvatar";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { Button } from "@/shared/components/ui/button";
import { Popover } from "@base-ui/react/popover";
import { Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function AccountMenu() {
  const { t, i18n } = useTranslation("profile");
  const { t: tCommunity } = useTranslation("community");

  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();

  const publicProfile = usePublicProfile(open ? (profile?.id ?? "") : "");

  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage ?? "en");

  const { error, ...signOutProps } = useSignOut();
  const { theme, label, toggleTheme } = useTheme();

  const name = profile?.display_name || t("preview.name");
  const complete = Boolean(profile?.display_name.trim() && profile.username);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={t("menu.open")}
        className="inline-flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <UserAvatar name={name} src={profile?.avatar_url} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup className="max-h-[80svh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border/60 bg-popover p-2 text-popover-foreground shadow-xl outline-none">
            <Popover.Title className="sr-only">{t("menu.title")}</Popover.Title>

            <div className="flex items-center gap-3 border-b border-border/40 px-3 py-3">
              <UserAvatar name={name} src={profile?.avatar_url} />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>

                {profile?.username && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    @{profile.username}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    aria-busy={publicProfile.isFetching}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="font-semibold tabular-nums text-foreground">
                      {publicProfile.data
                        ? formatter.format(publicProfile.data.followers_count)
                        : "—"}
                    </span>{" "}
                    {tCommunity("social.followersCount")}
                  </p>

                  {publicProfile.isError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={publicProfile.isFetching}
                      title={tCommunity("social.readError")}
                      onClick={() => void publicProfile.refetch()}
                      className="px-1 text-xs text-muted-foreground"
                    >
                      {tCommunity("actions.retry")}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1 px-2 py-2">
              <div className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-sm">{t("menu.theme")}</span>

                <ThemeToggle
                  theme={theme}
                  label={label}
                  onToggle={toggleTheme}
                />
              </div>

              <div className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-sm">{t("menu.language")}</span>
                <PreferencesSection />
              </div>
            </div>

            {complete && (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Settings aria-hidden="true" className="size-4" />
                {t("menu.settings")}
              </Link>
            )}

            <div className="mt-1 border-t border-border/40 pt-2">
              <SignOutButton {...signOutProps} />

              {error && (
                <p
                  role="alert"
                  className="px-3 py-2 text-xs leading-5 text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
