import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ArtistBubbleProps } from "@/models/musicOnboarding";
import { Button } from "@/shared/components/ui/button";

export function ArtistBubble({
  artist,
  selected,
  disabled,
  onSelect,
  onUnavailable,
}: ArtistBubbleProps) {
  const { t } = useTranslation("onboarding");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [loadedUrl, setLoadedUrl] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  const [floatingStep, setFloatingStep] = useState(0);
  const [popping, setPopping] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const identity = Array.from(artist.id).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  const loaded = loadedUrl === artist.imageUrl;

  useEffect(() => {
    const element = buttonRef.current;

    if (!element || !loaded || selected) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let visible = false;
    let interval: number | undefined;
    let delay: number | undefined;

    function stop(): void {
      window.clearInterval(interval);
      window.clearTimeout(delay);
      interval = undefined;
      delay = undefined;
    }

    function synchronize(): void {
      stop();

      if (
        !visible ||
        motion.matches ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      delay = window.setTimeout(
        () => {
          setFloatingStep((current) => (current + 1) % 4);

          interval = window.setInterval(() => {
            setFloatingStep((current) => (current + 1) % 4);
          }, 2400);
        },
        100 + (identity % 600),
      );
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        synchronize();
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    motion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);

    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [loaded, selected, identity]);

  useEffect(() => {
    if (!popping) {
      return;
    }

    let secondFrame = 0;

    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setExpanded(true);
      });
    });

    const timer = window.setTimeout(() => {
      setPopping(false);
      setExpanded(false);
    }, 320);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timer);
    };
  }, [popping]);

  if ((selected && !popping) || failedUrl === artist.imageUrl) {
    return null;
  }

  const movementClass =
    floatingStep === 1
      ? identity % 2 === 0
        ? "-translate-y-2 translate-x-1"
        : "-translate-y-3 -translate-x-1"
      : floatingStep === 2
        ? identity % 2 === 0
          ? "translate-y-1 -translate-x-1"
          : "-translate-y-1 translate-x-2"
        : floatingStep === 3
          ? "-translate-y-1 translate-x-0"
          : "translate-x-0 translate-y-0";

  const baseClass = [
    "relative flex w-full max-w-44 flex-col items-center gap-3",
    "transition-transform duration-[2300ms] ease-in-out",
    "motion-reduce:transform-none motion-reduce:transition-none",
    movementClass,
  ].join(" ");

  if (popping) {
    return (
      <span aria-hidden="true" className={baseClass}>
        <span className="relative block aspect-square w-full">
          <img
            src={artist.imageUrl}
            alt=""
            width={artist.imageWidth}
            height={artist.imageHeight}
            draggable={false}
            className={[
              "absolute inset-0 size-full rounded-full object-cover",
              "transition-[transform,opacity,filter] duration-200 ease-out",
              "motion-reduce:transition-none",
              expanded
                ? "scale-110 opacity-0 blur-sm"
                : "scale-100 opacity-100 blur-none",
            ].join(" ")}
          />

          <span
            className={[
              "pointer-events-none absolute inset-0 rounded-full border border-primary/40",
              "transition-[transform,opacity] duration-300 ease-out",
              "motion-reduce:transition-none",
              expanded ? "scale-150 opacity-0" : "scale-95 opacity-70",
            ].join(" ")}
          />
        </span>

        <span className="min-h-10 text-center text-sm font-medium leading-5 opacity-0">
          {artist.name}
        </span>
      </span>
    );
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      data-artist={artist.id}
      disabled={disabled || !loaded}
      aria-label={t("musicOnboarding.select", { name: artist.name })}
      className={[
        baseClass,
        "group h-auto! min-h-0! border-0! p-0!",
        "rounded-xl text-foreground hover:bg-transparent!",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        loaded ? "visible" : "invisible",
      ].join(" ")}
      onClick={(event) => {
        const button = event.currentTarget;

        if (!onSelect(artist)) {
          return;
        }

        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setPopping(true);
        }

        if (event.detail === 0) {
          const buttons = Array.from(
            button
              .closest("[data-artist-grid]")
              ?.querySelectorAll<HTMLButtonElement>(
                "button[data-artist]:not(:disabled)",
              ) ?? [],
          );

          const index = buttons.indexOf(button);
          const next = buttons[index + 1] ?? buttons[index - 1];

          if (next) {
            next.focus();
          } else {
            document.getElementById("musicArtistSearch")?.focus();
          }
        }
      }}
    >
      <span className="relative block aspect-square w-full">
        <span className="absolute inset-0 overflow-hidden rounded-full shadow-sm ring-1 ring-foreground/10">
          <img
            src={artist.imageUrl}
            alt=""
            width={artist.imageWidth}
            height={artist.imageHeight}
            decoding="async"
            draggable={false}
            className="size-full rounded-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035] group-focus-visible:scale-[1.035] motion-reduce:transition-none"
            onLoad={() => setLoadedUrl(artist.imageUrl)}
            onError={() => {
              setFailedUrl(artist.imageUrl);
              onUnavailable(artist.id, artist.imageUrl);
            }}
          />

          <span className="pointer-events-none absolute inset-0 rounded-full border border-background/20 bg-linear-to-br from-background/15 via-transparent to-foreground/10" />
        </span>
      </span>

      <span className="line-clamp-2 min-h-10 w-full whitespace-normal px-1 text-center text-sm font-medium leading-5 text-foreground sm:text-base">
        {artist.name}
      </span>
    </Button>
  );
}
