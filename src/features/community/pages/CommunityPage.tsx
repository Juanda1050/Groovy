import { Tabs } from "@base-ui/react/tabs";
import { RefreshCw,Search,WifiOff,X } from "lucide-react";
import { useId,useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AlbumPostCard } from "@/features/community/components/AlbumPostCard";
import { PublicProfileDialog } from "@/features/community/components/PublicProfileDialog";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";
import { useCommunityActions,useCommunitySocial } from "@/features/community/hooks/useCommunitySocial";
import { useCommunityUserSearch } from "@/features/community/hooks/usePublicProfile";
import { UserAvatar } from "@/features/profile/components/UserAvatar";
import { RecordLoader } from "@/shared/components/RecordLoader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import type { AlbumFeedCardProps,AlbumFeedItem } from "@/models/library";

export default function CommunityPage() {
  const { t } = useTranslation("community");

  const [tab, setTab] = useState<"community" | "following">("community");

  const [profileId, setProfileId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");

  const communityTab = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchId = useId();

  const searching = searchText.trim().length > 0;
  const following = tab === "following";

  const feed = useCommunityFeed(null, true, following);

  const search = useCommunityUserSearch(searchText, searching);

  const social = useCommunitySocial(
    searching ? [] : feed.items.map((item) => item.id),
  );

  const actions = useCommunityActions();

  function cardProps(item: AlbumFeedItem): AlbumFeedCardProps {
    const state = social.byId.get(item.id) ?? null;

    return {
      item,
      social: state,
      viewerId: actions.userId,
      busy: actions.disabled,

      onProfile: () => setProfileId(item.user_id),

      onReaction: () => actions.onAction("reaction", item.id, !state?.reacted),

      onFollow: () =>
        actions.onAction("follow", item.user_id, !state?.following_author),

      onSaveAlbum: () => actions.onAction("library", item.id, true),
    };
  }

  function onRefresh(): void {
    feed.onRefresh();
    social.onRetry();
  }

  const content = (
    <>
      {!feed.needsSignIn && feed.connection === "offline" && (
        <p
          role="status"
          className="
              flex items-center gap-2
              py-3 text-xs text-muted-foreground
            "
        >
          <WifiOff aria-hidden="true" className="size-3.5 shrink-0" />
          {t("connection.offline")}
        </p>
      )}

      {feed.updates && (
        <Button
          type="button"
          variant="ghost"
          disabled={feed.fetching}
          onClick={onRefresh}
          className="
            min-h-11 w-full rounded-none
            border-b border-border/40
            bg-transparent text-primary
            shadow-none hover:bg-primary/5
          "
        >
          {t("actions.updates")}
        </Button>
      )}

      {social.error && (
        <div
          role="alert"
          className="
            flex flex-wrap items-center gap-2 py-3
          "
        >
          <p className="text-xs text-destructive">{t("social.readError")}</p>

          <Button
            variant="ghost"
            onClick={social.onRetry}
            className="min-h-11 text-xs"
          >
            {t("actions.retry")}
          </Button>
        </div>
      )}

      {feed.needsSignIn ? (
        <p className="py-8 text-sm text-muted-foreground">
          {t("signInRequired")}
        </p>
      ) : feed.pending ? (
        <div
          role="status"
          className="
            flex items-center justify-center
            gap-3 py-12 text-sm
            text-muted-foreground
          "
        >
          <RecordLoader size="sm" />
          {t("loading")}
        </div>
      ) : feed.error && !feed.items.length ? (
        <div role="alert" className="space-y-3 py-8">
          <p className="text-sm text-destructive">{t("error")}</p>

          <Button
            type="button"
            variant="outline"
            onClick={feed.onRetry}
            disabled={feed.fetching}
          >
            {t("actions.retry")}
          </Button>
        </div>
      ) : (
        <>
          {!feed.items.length ? (
            <div className="px-3 py-12 text-center">
              <h2 className="text-base font-medium">
                {t(following ? "followingEmpty.title" : "empty.title")}
              </h2>

              <p
                className="
                  mx-auto mt-2 max-w-sm
                  text-sm leading-6
                  text-muted-foreground
                "
              >
                {t(
                  following
                    ? "followingEmpty.description"
                    : "empty.description",
                )}
              </p>

              {following ? (
                <Button
                  variant="outline"
                  className="mt-5 min-h-11 rounded-full"
                  onClick={() => {
                    setTab("community");
                    communityTab.current?.focus();
                  }}
                >
                  {t("followingEmpty.action")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-5 min-h-11 rounded-full"
                  render={<Link to="/library" />}
                >
                  {t("actions.library")}
                </Button>
              )}
            </div>
          ) : (
            <div aria-busy={feed.fetching} className="space-y-3 pt-4">
              {feed.items.map((item) => (
                <AlbumPostCard key={item.id} {...cardProps(item)} />
              ))}
            </div>
          )}

          {feed.error && (
            <div
              role="alert"
              className="
                flex flex-wrap items-center gap-2 py-3
              "
            >
              <p className="text-sm text-destructive">{t("error")}</p>

              {!feed.nextError && (
                <Button
                  variant="ghost"
                  disabled={feed.fetching}
                  onClick={feed.onRetry}
                  className="min-h-11 text-xs"
                >
                  {t("actions.retry")}
                </Button>
              )}
            </div>
          )}

          {(feed.hasMore || feed.nextError) && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={feed.fetching}
                onClick={feed.onLoadMore}
                className="
                  min-h-11 rounded-full px-5 text-xs
                "
              >
                {feed.loadingMore && <RecordLoader size="sm" />}

                {t(
                  feed.loadingMore
                    ? "loading"
                    : feed.nextError
                      ? "actions.retry"
                      : "actions.more",
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <section className="mx-auto w-full min-w-0 max-w-2xl pb-8">
      <header
        className="
          flex min-h-13 items-center
          justify-between gap-3 pb-2
        "
      >
        <h1
          className="
            min-w-0 text-xl
            font-semibold tracking-tight
          "
        >
          {t("navigation.community", {
            ns: "common",
          })}
        </h1>

        {!searching && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.refresh")}
            disabled={feed.fetching || feed.needsSignIn}
            onClick={onRefresh}
            className="size-11 shrink-0 rounded-full"
          >
            <RefreshCw
              aria-hidden="true"
              className={`
                size-4
                ${feed.fetching ? "motion-safe:animate-spin" : ""}
              `}
            />
          </Button>
        )}
      </header>

      <form
        role="search"
        className="relative mb-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor={searchId} className="sr-only">
          {t("search.label")}
        </label>

        <Search
          aria-hidden="true"
          className="
            pointer-events-none
            absolute left-4 top-1/2 z-10
            size-4 -translate-y-1/2
            text-muted-foreground
          "
        />

        <Input
          ref={searchInput}
          id={searchId}
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={t("search.placeholder")}
          maxLength={50}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="
            h-12 rounded-full
            bg-muted/30 pl-11 pr-12 text-base
            [&::-webkit-search-cancel-button]:appearance-none
          "
        />

        {searchText && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("search.clear")}
            className="
              absolute right-1 top-1/2
              size-11 -translate-y-1/2
              rounded-full
            "
            onClick={() => {
              setSearchText("");
              searchInput.current?.focus();
            }}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        )}
      </form>

      {searching ? (
        <section
          aria-label={t("search.results")}
          aria-busy={search.loading || search.fetching}
        >
          {feed.needsSignIn ? (
            <p className="py-8 text-sm text-muted-foreground">
              {t("signInRequired")}
            </p>
          ) : !search.canSearch ? (
            <p
              role="status"
              className="
                px-2 py-6 text-sm
                text-muted-foreground
              "
            >
              {t("search.hint")}
            </p>
          ) : search.loading ? (
            <div
              role="status"
              className="
                flex items-center justify-center
                gap-3 py-8 text-sm
                text-muted-foreground
              "
            >
              <RecordLoader size="sm" />
              {t("search.loading")}
            </div>
          ) : (
            <>
              {search.error && (
                <div role="alert" className="space-y-3 px-2 py-5">
                  <p className="text-sm text-destructive">
                    {t("search.error")}
                  </p>

                  <Button
                    variant="outline"
                    disabled={!search.canRetry}
                    onClick={search.onRetry}
                  >
                    {t("actions.retry")}
                  </Button>
                </div>
              )}

              {search.items.length ? (
                <>
                  <h2
                    className="
                      px-2 pb-1 pt-2
                      text-sm font-semibold
                    "
                  >
                    {t("search.results")}
                  </h2>

                  <ul className="divide-y divide-border/40">
                    {search.items.map((person) => {
                      const name =
                        person.display_name ||
                        person.username ||
                        t("post.author");

                      return (
                        <li
                          key={person.id}
                          className="
                            flex min-w-0
                            items-center gap-2 py-2
                          "
                        >
                          <button
                            type="button"
                            onClick={() => setProfileId(person.id)}
                            aria-label={t("social.openProfile", { name })}
                            className="
                              flex min-h-14 min-w-0
                              flex-1 items-center gap-3
                              rounded-xl px-2 text-left
                              outline-none
                              hover:bg-muted/40
                              focus-visible:ring-2
                              focus-visible:ring-ring
                            "
                          >
                            <UserAvatar name={name} src={person.avatar_url} />

                            <span className="min-w-0 flex-1">
                              <span
                                className="
                                  block truncate
                                  text-sm font-semibold
                                "
                              >
                                {name}
                              </span>

                              {person.username && (
                                <span
                                  className="
                                    block truncate text-xs
                                    text-muted-foreground
                                  "
                                >
                                  @{person.username}
                                </span>
                              )}
                            </span>
                          </button>

                          {person.id === actions.userId ? (
                            <span
                              className="
                                shrink-0 px-2 text-xs
                                text-muted-foreground
                              "
                            >
                              {t("search.own")}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant={person.following ? "outline" : "default"}
                              disabled={actions.disabled}
                              aria-pressed={person.following}
                              aria-label={t(
                                person.following
                                  ? "social.unfollow"
                                  : "social.follow",
                              )}
                              onClick={() =>
                                actions.onAction(
                                  "follow",
                                  person.id,
                                  !person.following,
                                )
                              }
                              className="
                                min-h-11 shrink-0
                                rounded-full px-3
                                text-xs sm:px-4
                              "
                            >
                              {t(
                                person.following
                                  ? "social.following"
                                  : "social.follow",
                              )}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {search.hasMore && (
                    <p
                      className="
                        px-2 py-4 text-xs
                        text-muted-foreground
                      "
                    >
                      {t("search.more")}
                    </p>
                  )}
                </>
              ) : (
                !search.error && (
                  <p
                    role="status"
                    className="
                      px-2 py-8 text-center
                      text-sm text-muted-foreground
                    "
                  >
                    {t("search.empty")}
                  </p>
                )
              )}
            </>
          )}
        </section>
      ) : (
        <Tabs.Root
          value={tab}
          onValueChange={(value) => {
            if (value === "community" || value === "following") {
              setTab(value);
            }
          }}
        >
          <Tabs.List
            aria-label={t("tabs.label")}
            className="
              grid grid-cols-2
              border-b border-border/50
            "
          >
            <Tabs.Tab
              ref={communityTab}
              value="community"
              className="
                min-h-12 border-b-2
                border-transparent px-3
                text-sm font-medium
                text-muted-foreground outline-none
                hover:bg-muted/40
                focus-visible:ring-2
                focus-visible:ring-inset
                focus-visible:ring-ring
                data-active:border-primary
                data-active:text-foreground
              "
            >
              {t("tabs.community")}
            </Tabs.Tab>

            <Tabs.Tab
              value="following"
              className="
                min-h-12 border-b-2
                border-transparent px-3
                text-sm font-medium
                text-muted-foreground outline-none
                hover:bg-muted/40
                focus-visible:ring-2
                focus-visible:ring-inset
                focus-visible:ring-ring
                data-active:border-primary
                data-active:text-foreground
              "
            >
              {t("tabs.following")}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            value="community"
            className="
              rounded-lg outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            {content}
          </Tabs.Panel>

          <Tabs.Panel
            value="following"
            className="
              rounded-lg outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            {content}
          </Tabs.Panel>
        </Tabs.Root>
      )}

      {profileId && (
        <PublicProfileDialog
          key={profileId}
          userId={profileId}
          open
          onOpenChange={(open) => {
            if (!open) {
              setProfileId(null);
            }
          }}
        />
      )}
    </section>
  );
}
