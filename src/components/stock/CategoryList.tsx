import { Category } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryDialog } from './CategoryDialog';

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCategoriesChange: () => void;
}

export function CategoryList({ categories, selectedCategory, onSelectCategory, onCategoriesChange }: CategoryListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Kategoriler</h3>
        <Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left',
          !selectedCategory ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'
        )}
      >
        <FolderOpen className="w-4 h-4" />
        <span className="text-sm">Tüm Ürünler</span>
      </button>

      <div className="space-y-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left',
              selectedCategory === category.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'
            )}
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm">{category.name}</span>
          </button>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Henüz kategori yok
        </p>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={() => {
          onCategoriesChange();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
