import React from 'react';
import { Product } from '../types';
import { ArrowRight, Star, CheckCircle, Heart } from 'lucide-react';

interface ShowcaseSectionProps {
  products: Product[];
  isLoading: boolean;
  onProductClick: (product: Product) => void;
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
}

const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({ products, isLoading, onProductClick, wishlist = [], onToggleWishlist }) => {
  if (isLoading) {
    return (
      <div className="w-full px-4 mb-6">
        <div className="flex gap-3 overflow-hidden">
             {[1, 2, 3].map(i => (
                <div key={i} className="w-[160px] h-[280px] bg-slate-100 rounded-lg animate-pulse flex-shrink-0 border border-slate-200"></div>
             ))}
        </div>
      </div>
    );
  }

  const formatPrice = (priceStr: string) => {
      if (!priceStr) return "00,00";
      // Remove R$, spaces, then split by comma or dot
      const numericPart = priceStr.replace(/[^\d,.]/g, '');
      return numericPart;
  };

  const calculateOriginalPrice = (priceStr: string) => {
      try {
        const clean = priceStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        if (isNaN(num)) return "0,00";
        return (num * 1.2).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      } catch (e) {
        return "0,00";
      }
  };

  return (
    <div className="w-full pl-4 mb-6">
      <div className="flex justify-between items-center pr-4 mb-3">
        <h2 className="text-lg font-bold text-slate-800 leading-tight">Ofertas do Dia</h2>
        <button className="text-sm text-cyan-700 hover:text-orange-600 hover:underline">
            Ver todas
        </button>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x pr-4">
        {products.map((product) => {
          const price = product.priceEstimate || "R$ 0,00";
          const originalPrice = calculateOriginalPrice(price);
          const [mainPrice, cents] = formatPrice(price).split(',');
          const isLiked = wishlist.some(p => p.id === product.id);

          return (
          <div 
              key={product.id} 
              onClick={() => onProductClick(product)}
              className="snap-center shrink-0 w-[160px] md:w-[200px] bg-white rounded-lg overflow-hidden cursor-pointer shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col group"
          >
            {/* Image Area */}
            <div className="h-[160px] w-full p-4 bg-white flex items-center justify-center relative">
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
                {/* Badge Discount */}
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    {Math.floor(Math.random() * 30) + 10}% OFF
                </div>

                {/* Heart Button */}
                {onToggleWishlist && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(product);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:scale-110 transition-transform active:scale-95"
                    >
                        <Heart 
                            size={14} 
                            className={`${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} 
                        />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-3 flex flex-col flex-grow bg-slate-50/30">
              
              {/* Description */}
              <h3 className="text-xs text-slate-900 line-clamp-2 leading-snug mb-1 h-8 hover:text-orange-600 group-hover:underline">
                {product.name}
              </h3>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-1">
                 {[1,2,3,4].map(s => <Star key={s} size={10} className="text-yellow-500 fill-yellow-500" />)}
                 <Star size={10} className="text-yellow-500 fill-yellow-500 opacity-50" />
                 <span className="text-[9px] text-cyan-700 ml-1">({product.reviewCount || 99})</span>
              </div>
              
              {/* Price */}
              <div className="mt-auto">
                  <span className="text-[10px] text-slate-500 line-through block">R$ {originalPrice}</span>
                  <div className="flex items-center gap-1">
                      <span className="text-sm font-light text-slate-900">R$</span>
                      <span className="text-xl font-bold text-slate-900">{mainPrice}</span>
                      <span className="text-xs font-bold text-slate-900 relative -top-1">,{cents || '00'}</span>
                  </div>
                  
                  {/* Prime/Full Badge Simulation */}
                  <div className="flex items-center gap-1 mt-1">
                      <CheckCircle size={10} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-slate-700">Prime <span className="font-normal text-slate-500">Entrega Grátis</span></span>
                  </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default ShowcaseSection;