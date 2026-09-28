"use client";

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}: {
  categories: { id: string; name: string }[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b bg-white px-4 py-2">
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          selectedCategoryId === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
        }`}
      >
        الكل
      </button>

      {categories.map((category) => (
        <button
          type="button"
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategoryId === category.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
