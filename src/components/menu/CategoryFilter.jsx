export default function CategoryFilter({ categories, selected, onChange }) {
  return (
    <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-md border-b border-white/5 py-3 px-4">
      <div className="max-w-xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onChange('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            selected === 'all'
              ? 'bg-amber-500 text-gray-900'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              selected === cat.id
                ? 'bg-amber-500 text-gray-900'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}
