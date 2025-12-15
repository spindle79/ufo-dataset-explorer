"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface CategoryInputProps {
  value: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  apiPath?: string; // API endpoint to fetch categories from (default: '/api/audio/categories')
}

export default function CategoryInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Type a category and press Enter...",
  apiPath = "/api/audio/categories",
}: CategoryInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch all available categories for typeahead
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(apiPath);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, [apiPath]);

  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter(
        (cat) =>
          cat.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(cat)
      )
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedIndex(-1);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions.length > 0) {
        // Add selected suggestion
        const selected = filteredSuggestions[selectedIndex];
        if (!value.includes(selected)) {
          onChange([...value, selected]);
        }
        setInputValue("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
      } else if (inputValue.trim()) {
        // Add typed value
        const newCategory = inputValue.trim().toLowerCase();
        if (newCategory && !value.includes(newCategory)) {
          onChange([...value, newCategory]);
        }
        setInputValue("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
      setShowSuggestions(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last category if input is empty and backspace is pressed
      onChange(value.slice(0, -1));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!value.includes(suggestion)) {
      onChange([...value, suggestion]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    onChange(value.filter((cat) => cat !== categoryToRemove));
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events to fire
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2.5rem] p-2 border border-gray-300 rounded-md shadow-sm focus-within:ring-blue-500 focus-within:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
        {value.map((category, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
          >
            {category}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveCategory(category)}
                className="hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none transition-colors"
                aria-label={`Remove ${category}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
