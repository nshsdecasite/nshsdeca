"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectMenuProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerLabel?: string;
  required?: boolean;
  disabled?: boolean;
  invalidMessage?: string;
  className?: string;
  variant?: "field" | "pill";
  active?: boolean;
  searchable?: boolean;
  "aria-label"?: string;
};

export function SelectMenu({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  options,
  placeholder = "Select",
  triggerLabel,
  required = false,
  disabled = false,
  invalidMessage,
  className,
  variant = "field",
  active = false,
  searchable,
  "aria-label": ariaLabel,
}: SelectMenuProps) {
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = controlled ? value : uncontrolled;
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeTimer = useRef<number | null>(null);
  const typeBuffer = useRef("");
  const typeTimer = useRef<number | null>(null);
  const focusedOnOpen = useRef(false);
  const valueRef = useRef(current);
  const openMenuRef = useRef<() => void>(() => undefined);
  valueRef.current = current;

  const listId = useId();
  const canSearch = searchable ?? options.length > 8;
  const selected = options.find((option) => option.value === current);
  const label = triggerLabel ?? selected?.label ?? placeholder;
  const showingPlaceholder = !triggerLabel && !selected;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const optionKey = options.map((option) => option.value).join("\0");
  useEffect(() => {
    if (controlled) return;
    if (!current) return;
    if (optionKey.split("\0").includes(current)) return;
    setUncontrolled("");
  }, [controlled, current, optionKey]);

  useEffect(() => {
    if (!required) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    function onSubmit(event: Event) {
      if (valueRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setInvalid(true);
      openMenuRef.current();
    }
    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [required]);

  useEffect(() => {
    if (!present) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minWidth = canSearch ? 280 : Math.max(rect.width, 180);
      const width = Math.min(window.innerWidth - 16, Math.max(rect.width, minWidth));
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(320, openUp ? spaceAbove : spaceBelow));
      setCoords(
        openUp
          ? { left, width, maxHeight, bottom: window.innerHeight - rect.top + 6 }
          : { left, width, maxHeight, top: rect.bottom + 6 },
      );
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [present, canSearch, filtered.length]);

  useEffect(() => {
    if (!present) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu(false);
    }
    function onFocusIn(event: FocusEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKey);
    };
  }, [present]);

  useEffect(() => {
    if (!present) {
      focusedOnOpen.current = false;
      return;
    }
    if (!coords || focusedOnOpen.current) return;
    const focusTarget = canSearch ? searchRef.current : listRef.current;
    if (!focusTarget) return;
    focusTarget.focus();
    focusedOnOpen.current = true;
  }, [present, coords, canSearch]);

  useEffect(() => {
    if (!present || !coords) return;
    optionRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, present, coords]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
    };
  }, []);

  function openMenu() {
    if (disabled) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const index = Math.max(
      0,
      options.findIndex((option) => option.value === valueRef.current && !option.disabled),
    );
    setHighlight(index);
    setQuery("");
    setPresent(true);
    setOpen(true);
  }

  openMenuRef.current = openMenu;

  function closeMenu(restoreFocus: boolean) {
    setOpen(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPresent(false);
      setCoords(null);
      if (restoreFocus) triggerRef.current?.focus();
    }, 140);
  }

  function choose(next: string) {
    if (!controlled) setUncontrolled(next);
    setInvalid(false);
    onValueChange?.(next);
    closeMenu(true);
  }

  function move(step: number) {
    if (filtered.length === 0) return;
    let index = highlight;
    for (let attempt = 0; attempt < filtered.length; attempt += 1) {
      index = (index + step + filtered.length) % filtered.length;
      if (!filtered[index]?.disabled) {
        setHighlight(index);
        return;
      }
    }
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!present) openMenu();
      else if (event.key === "ArrowDown") move(1);
      else if (event.key === "ArrowUp") move(-1);
      else if (event.key === "Enter" || event.key === " ") {
        const option = filtered[highlight];
        if (option && !option.disabled) choose(option.value);
      }
    }
  }

  function onListKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlight(Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter" || (event.key === " " && !canSearch)) {
      event.preventDefault();
      const option = filtered[highlight];
      if (option && !option.disabled) choose(option.value);
    } else if (!canSearch && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      typeBuffer.current = `${typeBuffer.current}${event.key.toLowerCase()}`;
      const match = filtered.findIndex((option) =>
        option.label.toLowerCase().startsWith(typeBuffer.current),
      );
      if (match >= 0) setHighlight(match);
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
      typeTimer.current = window.setTimeout(() => {
        typeBuffer.current = "";
      }, 500);
    }
  }

  const activeId = filtered[highlight] ? `${listId}-option-${highlight}` : undefined;

  return (
    <div ref={rootRef} className={cn("relative", variant === "field" && "w-full")}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={
          ariaLabel ? (selected?.value ? `${ariaLabel}, ${selected.label}` : ariaLabel) : undefined
        }
        aria-haspopup="listbox"
        aria-expanded={present}
        aria-controls={present ? listId : undefined}
        aria-invalid={invalid || undefined}
        title={selected?.label ?? label}
        onClick={() => (present && open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          variant === "field"
            ? "deca-field flex w-full items-center justify-between gap-3 text-left"
            : "inline-flex max-w-full items-center justify-between gap-2 rounded-full bg-white px-4 py-2.5 text-left text-[13px] font-bold text-ink shadow-card hover:bg-ever-lt",
          variant === "pill" && active && "bg-ever-dk text-white hover:bg-acc-deep",
          showingPlaceholder && "text-mute",
          invalid && "ring-2 ring-[#b42318]",
          className,
        )}
      >
        <span className={cn("min-w-0 truncate", variant === "field" ? "flex-1" : "max-w-[220px]")}>
          {label}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "shrink-0 opacity-70 transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
            variant === "pill" ? "h-3.5 w-3.5" : "h-4 w-4",
            open && "rotate-180",
          )}
        />
      </button>
      {name ? (
        <input
          name={name}
          value={current}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus();
            openMenu();
          }}
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        />
      ) : null}
      {invalid && invalidMessage ? (
        <p className="mt-1.5 text-sm text-[#b42318]">{invalidMessage}</p>
      ) : null}
      {present && coords
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                left: coords.left,
                width: coords.width,
                top: coords.top,
                bottom: coords.bottom,
                maxHeight: coords.maxHeight,
              }}
              className={cn(
                "fixed z-[80] flex flex-col rounded-[16px] bg-white p-1.5 shadow-[0_1px_2px_rgba(43,42,37,0.06),0_16px_40px_rgba(43,42,37,0.14)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
              )}
            >
              {canSearch ? (
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onListKeyDown}
                  placeholder="Search…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  className="mb-1 w-full shrink-0 rounded-[10px] bg-ground px-3 py-2 text-sm text-ink outline-none placeholder:text-mute"
                />
              ) : null}
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                tabIndex={canSearch ? -1 : 0}
                aria-label={ariaLabel}
                aria-activedescendant={canSearch ? undefined : activeId}
                onKeyDown={canSearch ? undefined : onListKeyDown}
                className="min-h-0 overflow-y-auto overscroll-contain outline-none"
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-mute">No matches</p>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === current;
                    const isHighlighted = index === highlight;
                    return (
                      <button
                        key={`${option.value}-${option.label}`}
                        id={`${listId}-option-${index}`}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        onPointerDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => choose(option.value)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors duration-150",
                          isHighlighted && "bg-ever-lt",
                          isSelected && "text-ever-dk",
                          option.disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <span className="min-w-0 text-pretty">{option.label}</span>
                        {isSelected ? (
                          <Check aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
