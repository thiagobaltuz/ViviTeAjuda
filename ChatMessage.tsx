import React from 'react';
import { ChatMessage as ChatMessageType, Product } from '../types';
import { injectAffiliateTags, getAffiliateLink } from '../services/affiliateService';
import { User, Sparkles, Star, ExternalLink, ShoppingBag, Truck, Heart } from 'lucide-react';

interface Props {
  message: ChatMessageType;
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
}

const ChatMessage: React.FC<Props> = ({ message, wishlist = [], onToggleWishlist }) => {
  const isAi = message.role === 'model';
  const processedText = injectAffiliateTags(message.text);
  const hasProducts = message.products && message.products.length > 0;
  
  // If only 1 product, we use a different layout (Featured Card)
  const isSingleProduct = hasProducts && message.products!.length === 1;

  const isLiked = (id: string) => wishlist.some(p => p.id === id);

  return (
    <div className={`flex w-full mb-6 ${isAi ? 'justify-start' : 'justify-end'} animate-fade-in-up px-2`}>
      <div className={`flex flex-col w-full ${isAi ? 'items-start' : 'items-end'}`}>
        
        {/* 1. BUBBLE AREA */}
        <div className={`flex max-w-[90%] md:max-w-[80%] gap-2 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
            
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border mt-1 ${
                isAi ? 'bg-white border-slate-300' : 'bg-slate-200 border-slate-300'
            }`}>
                {isAi ? <Sparkles size={14} className="text-orange-500" /> : <User size={14} className="text-slate-600" />}
            </div>

            <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                {/* User Uploaded Image */}
                {!isAi && message.image && (
                <div className="mb-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <img src={message.image} alt="Upload" className="max-w-[150px] object-cover rounded" />
                </div>
                )}

                {/* Message Text */}
                <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                isAi 
                    ? 'bg-white border-slate-200 text-slate-800 rounded-2xl rounded-tl-none' 
                    : 'bg-cyan-50 border-cyan-100 text-slate-900 rounded-2xl rounded-tr-none'
                }`}>
                    {isAi && <div className="text-[10px] font-bold text-orange-600 mb-1">Vivi Assistant</div>}
                    <div dangerouslySetInnerHTML={{ __html: processedText.replace(/\n/g, '<br/>') }} />
                </div>
            </div>
        </div>

        {/* 2. PRODUCT DISPLAY AREA */}
        {isAi && hasProducts && (
            <div className={`mt-3 pl-10 w-full ${isSingleProduct ? 'max-w-sm' : 'overflow-x-auto hide-scrollbar snap-x flex gap-3 pr-4'}`}>
                {message.products!.map((product, idx) => {
                    const liked = isLiked(product.id);
                    // Generate link with affiliate tag for the button
                    const buyLink = getAffiliateLink(product.productUrl || product.description);

                    return (
                    <div 
                        key={idx}
                        className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-orange-300 transition-colors ${
                            isSingleProduct ? 'w-full' : 'snap-center shrink-0 w-[200px]'
                        }`}
                    >
                        {/* Image */}
                        <div className={`${isSingleProduct ? 'h-[220px]' : 'h-[180px]'} w-full p-6 flex items-center justify-center bg-white relative`}>
                            <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Tags */}
                            <div className="absolute top-3 left-3 flex flex-col gap-1">
                                <div className="bg-slate-900 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                    PRIME
                                </div>
                                {isSingleProduct && (
                                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                        OFERTA
                                    </div>
                                )}
                            </div>

                            {/* Heart Button */}
                            {onToggleWishlist && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleWishlist(product);
                                    }}
                                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm hover:scale-110 transition-transform active:scale-95"
                                >
                                    <Heart 
                                        size={18} 
                                        className={`${liked ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} 
                                    />
                                </button>
                            )}
                        </div>

                        {/* Details */}
                        <div className="p-4 flex flex-col flex-grow bg-slate-50 border-t border-slate-100">
                            <h4 className={`${isSingleProduct ? 'text-sm' : 'text-xs'} font-bold text-slate-900 line-clamp-2 leading-snug mb-1`}>
                                {product.name}
                            </h4>
                            
                            <div className="flex items-center gap-1 mb-3">
                                <div className="flex text-yellow-400">
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" />
                                    <Star size={12} fill="currentColor" className="text-slate-300" />
                                </div>
                                <span className="text-[10px] text-slate-500">({Math.floor(Math.random() * 500)} avaliações)</span>
                            </div>

                            {/* Price Area */}
                            <div className="mt-auto">
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-xs text-slate-500 font-light">R$</span>
                                    <span className={`${isSingleProduct ? 'text-2xl' : 'text-lg'} font-extrabold text-slate-900`}>
                                        {(product.priceEstimate || "0,00").replace('R$', '').trim()}
                                    </span>
                                </div>
                                
                                {isSingleProduct && (
                                    <div className="flex items-center gap-2 text-[10px] text-green-600 font-medium mb-3 bg-green-50 w-fit px-2 py-1 rounded">
                                        <Truck size={12} />
                                        <span>Frete Grátis disponível</span>
                                    </div>
                                )}
                                
                                <a 
                                    href={buyLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-slate-900 text-sm font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                                >
                                    Ver na Loja <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        )}

        {/* Timestamp */}
        <span className={`text-[9px] text-slate-400 mt-1 px-1 w-full ${isAi ? 'text-left pl-12' : 'text-right'}`}>
            {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>

      </div>
    </div>
  );
};

export default ChatMessage;