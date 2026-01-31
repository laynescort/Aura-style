
import React from 'react';
import { WardrobeItem } from '../types';
import { Trash2 } from 'lucide-react';

interface Props {
  item: WardrobeItem;
  onDelete: (id: string) => void;
}

export const WardrobeCard: React.FC<Props> = ({ item, onDelete }) => {
  return (
    <div className="group relative bg-white dark:bg-white/5 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-white/10">
      <div className="aspect-[3/4] overflow-hidden relative">
        <img 
          src={item.imageUrl} 
          alt={item.category} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            onClick={() => onDelete(item.id)}
            className="bg-red-500 text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest mb-1 truncate">{item.category}</h4>
            <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-white capitalize">{item.color}</p>
          </div>
          <button 
            onClick={() => onDelete(item.id)}
            className="sm:hidden p-2 text-slate-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] sm:text-[10px] font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
