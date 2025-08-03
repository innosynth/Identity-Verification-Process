import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CommandSearchProps {
  items: SearchableItem[];
  selectedId?: string;
  onSelect: (item: SearchableItem) => void;
  placeholder?: string;
  className?: string;
}

export const CommandSearch = ({
  items,
  selectedId,
  onSelect,
  placeholder = "Search...",
  className
}: CommandSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const selectedItem = items.find(item => item.id === selectedId);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 border border-input rounded-lg bg-background text-left",
          "hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200",
          "hover:shadow-md hover:shadow-primary/5",
          isOpen && "border-ring ring-2 ring-ring shadow-lg"
        )}
      >
        <div className="flex items-center flex-1">
          {selectedItem ? (
            <>
              {selectedItem.icon && (
                <span className="mr-3 text-xl">{selectedItem.icon}</span>
              )}
              <div>
                <span className="font-medium">{selectedItem.label}</span>
                {selectedItem.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedItem.description}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Select an option...</span>
          )}
        </div>
        <Search className={cn(
          "w-5 h-5 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-input rounded-lg shadow-xl z-50 animate-scale-in">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No results found
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="w-full flex items-center p-3 hover:bg-muted text-left transition-colors group"
                >
                  {item.icon && (
                    <span className="mr-3 text-xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {selectedId === item.id && (
                    <Check className="w-4 h-4 text-primary ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
