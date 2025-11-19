import { cn } from '@/lib/utils';

interface AlphabetFilterProps {
  selectedLetter: string | null;
  onSelectLetter: (letter: string | null) => void;
}

export function AlphabetFilter({ selectedLetter, onSelectLetter }: AlphabetFilterProps) {
  const letters = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectLetter(null)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            !selectedLetter
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80 text-foreground'
          )}
        >
          Tümü
        </button>
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => onSelectLetter(letter)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              selectedLetter === letter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80 text-foreground'
            )}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
