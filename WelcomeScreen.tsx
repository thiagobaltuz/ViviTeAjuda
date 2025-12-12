import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

const slides = [
  {
    id: 1,
    // Friendly female consultant image to simulate "Vivi"
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop", 
    title: "Sua Consultora de Compras Pessoal",
    description: "A Vivi analisa milhares de produtos na Amazon e Mercado Livre para encontrar exatamente o que você precisa, pelo melhor preço."
  },
  {
    id: 2,
    // Travel/Lifestyle/Adventure image
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
    title: "Desbloqueie Novas Experiências",
    description: "Organize seus desejos, descubra novos destinos de compra e garanta ofertas memoráveis com inteligência artificial."
  }
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentSlide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onEnter();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlideIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 300); // Matches fade out duration
    }
  };

  const handleBack = () => {
    if (currentSlideIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlideIndex(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black font-sans text-white overflow-hidden">
      
      {/* Background Image Layer */}
      <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
        <img 
          src={currentSlide.image} 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay Gradient (Matches Image 1 style) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 flex flex-col justify-end p-8 pb-10">
        
        {/* Text Content */}
        <div className={`mb-8 transition-all duration-500 transform ${isAnimating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-4 drop-shadow-lg brand-font">
            {currentSlide.title}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed font-light max-w-xs drop-shadow-md">
            {currentSlide.description}
          </p>
          
          {/* Pagination Dots (Matches Image 2 reference) */}
          <div className="flex gap-2 mt-6">
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlideIndex ? 'w-8 bg-orange-500' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Buttons Row (Exact layout from Image 1) */}
        <div className="flex items-center gap-4">
          
          {/* Back Button (Circle Outline) */}
          <button 
            onClick={handleBack}
            className={`w-14 h-14 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all ${currentSlideIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ArrowLeft size={24} />
          </button>

          {/* Action Button (Orange Pill) */}
          <button 
            onClick={handleNext}
            className="flex-grow h-14 bg-[#F37A22] hover:bg-[#d66615] rounded-full text-white font-bold text-base shadow-lg shadow-orange-900/20 active:scale-95 transition-all flex items-center justify-center"
          >
            {isLastSlide ? "Começar Agora" : "Próximo"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeScreen;