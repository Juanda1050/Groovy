import { Search, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface SearchInputProps {
  id: string;
  value: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}

export function SearchInput({
  id,
  value,
  label,
  placeholder,
  clearLabel,
  disabled,
  onValueChange,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative w-full max-w-2xl">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted-foreground"
      />

      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="search"
        value={value}
        maxLength={120}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        className="h-12! min-h-12! rounded-xl py-2! pr-12! pl-11! text-base! sm:text-sm!"
      />

      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={clearLabel}
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1 size-10 -translate-y-1/2 rounded-lg"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
