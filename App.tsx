import React, { useState, useEffect, useRef } from 'react';
import { generateShowcaseProducts, sendMessageToVivi } from './services/geminiService';
import ShowcaseSection from './components/ShowcaseSection';
import ChatMessage from './components/ChatMessage';
import WelcomeScreen from './components/WelcomeScreen';
import { Product, ChatMessage as ChatMessageType, LoadingState } from './types';
import { Send, Mic, Plus, ArrowLeft, X, Sparkles, Heart, ShoppingBag, MessageCircle, Camera, Image as ImageIcon, Keyboard, Zap, Search, MapPin, Menu, Bell } from 'lucide-react';
import { FOLLOW_UP_PHRASES } from './constants';
import { getAffiliateLink } from './services/affiliateService';

const SUGGESTION_CHIPS = [
    "Ofertas do dia",
    "Celulares baratos",
    "Presente para mãe",
    "Tênis de corrida"
];

export default function App() {
  // State for Welcome Screen
  const [hasEnteredStore, setHasEnteredStore] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [showcaseStatus, setShowcaseStatus] = useState<LoadingState>(LoadingState.IDLE);
  
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Wishlist State
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Input & Menu State
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // "Typing" state logic
  const [isAiProcessing, setIsAiProcessing] = useState(false); // Waiting for API
  const [isAiTyping, setIsAiTyping] = useState(false); // Simulating typing effect
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow-up Timer Reference
  const followUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View State (To switch between the big greeting and the chat list)
  const [hasStartedChatting, setHasStartedChatting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null); // For Camera (Environment)
  const textInputRef = useRef<HTMLInputElement>(null); // For Text Focus

  useEffect(() => {
    // Initial Load - Generate "Trends"
    const loadShowcase = async () => {
      setShowcaseStatus(LoadingState.LOADING);
      try {
        const items = await generateShowcaseProducts();
        setProducts(items);
        setShowcaseStatus(LoadingState.SUCCESS);
      } catch (error) {
        console.error(error);
        setShowcaseStatus(LoadingState.ERROR);
      }
    };
    loadShowcase();
  }, []);

  useEffect(() => {
    if (hasEnteredStore) {
        scrollToBottom();
    }
  }, [messages, isAiTyping, isAiProcessing, hasEnteredStore]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- WISHLIST LOGIC ---
  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
        const exists = prev.find(p => p.id === product.id);
        if (exists) {
            return prev.filter(p => p.id !== product.id);
        }
        return [...prev, product];
    });
  };

  const sendWishlistToWhatsapp = () => {
    if (wishlist.length === 0) return;

    // Clean number
    const phone = whatsappNumber.replace(/\D/g, '');
    
    let text = `*Olá! Aqui está sua lista de favoritos da ShopAI (Vivi)* ✨\n\n`;
    
    wishlist.forEach(p => {
        // Use productUrl explicitly for the link logic
        const link = getAffiliateLink(p.productUrl || p.description);
        text += `🛍️ *${p.name}*\n💰 ${p.priceEstimate}\n🔗 *Link:* ${link}\n\n`;
    });
    
    text += `_Espero que faça ótimas compras!_`;

    const encodedText = encodeURIComponent(text);
    // If number is provided, send to that number, otherwise open contact picker
    const url = phone.length > 8 
        ? `https://wa.me/55${phone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
        
    window.open(url, '_blank');
    setIsWishlistOpen(false);
  };
  // -----------------------

  // --- AUTOMATED FOLLOW-UP LOGIC ---
  useEffect(() => {
    if (followUpTimeoutRef.current) {
        clearTimeout(followUpTimeoutRef.current);
        followUpTimeoutRef.current = null;
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role === 'user' || isAiProcessing || isAiTyping) return;

    // Only follow up if the last message had products (meaning it was a recommendation)
    if (lastMessage.role === 'model' && lastMessage.products && lastMessage.products.length > 0) {
        followUpTimeoutRef.current = setTimeout(() => {
            // Select a random phrase from the constants file
            const randomPhrase = FOLLOW_UP_PHRASES[Math.floor(Math.random() * FOLLOW_UP_PHRASES.length)];
            processIncomingAiResponse(randomPhrase, []);
        }, 15000); 
    }
  }, [messages, isAiProcessing, isAiTyping]);
  // ---------------------------------

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
        recordingInterval.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    } else {
        if (recordingInterval.current) clearInterval(recordingInterval.current);
        setRecordingTime(0);
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current); };
  }, [isRecording]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setHasStartedChatting(true); 
        // Menu is already closed by handleMenuAction, but safeguard here
        setIsAttachMenuOpen(false); 
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Navegador sem suporte a voz.");
      return;
    }

    setHasStartedChatting(true);
    setIsRecording(true);
    setIsAttachMenuOpen(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onend = () => setIsRecording(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  /**
   * Orchestrates the Human-like typing effect AND distributes products per bubble
   */
  const processIncomingAiResponse = async (fullText: string, products?: Product[]) => {
      const textParts = fullText.split('|||').map(t => t.trim()).filter(t => t.length > 0);
      
      setIsAiProcessing(false); // API call done
      
      const numberOfTextParts = textParts.length;
      const numberOfProducts = products?.length || 0;
      
      // Calculate where to start attaching products. 
      const startAssigningProductsAtIndex = Math.max(0, numberOfTextParts - numberOfProducts);

      for (let i = 0; i < numberOfTextParts; i++) {
          const part = textParts[i];
          const isLastPart = i === numberOfTextParts - 1;
          
          // Determine if this bubble gets a product
          let productsForThisBubble: Product[] | undefined = undefined;
          
          if (numberOfProducts > 0 && products) {
              const productIndex = i - startAssigningProductsAtIndex;
              
              if (isLastPart) {
                 const startIndex = Math.max(0, productIndex);
                 if (startIndex < numberOfProducts) {
                    productsForThisBubble = products.slice(startIndex);
                 } else if (numberOfTextParts === 1 && numberOfProducts > 0) {
                    productsForThisBubble = products;
                 }
              } else {
                 if (productIndex >= 0 && productIndex < numberOfProducts) {
                    productsForThisBubble = [products[productIndex]];
                 }
              }
          }

          // 1. Set Typing State
          setIsAiTyping(true);
          scrollToBottom();

          // 2. Calculate dynamic delay
          const typingDelay = Math.min(3000, Math.max(1000, part.length * 30));
          await new Promise(resolve => setTimeout(resolve, typingDelay));

          // 3. Add Message
          setIsAiTyping(false);
          
          setMessages(prev => [
              ...prev,
              {
                  id: (Date.now() + i).toString(),
                  role: 'model',
                  text: part,
                  products: productsForThisBubble,
                  timestamp: new Date()
              }
          ]);

          // 4. Short pause between bubbles
          if (!isLastPart) {
              await new Promise(resolve => setTimeout(resolve, 600)); 
          }
      }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if ((!textToSend.trim() && !selectedImage) || isAiProcessing || isAiTyping) return;

    if (!hasStartedChatting) setHasStartedChatting(true);

    const userText = textToSend;
    const userImage = selectedImage;
    
    setInputValue('');
    setSelectedImage(null);
    setIsAttachMenuOpen(false);
    
    // Get last model message to provide context (CRITICAL for fixing the automation disconnect)
    const lastMsg = messages[messages.length - 1];
    const context = lastMsg?.role === 'model' ? lastMsg.text : undefined;

    // Optimistic Update (User Bubble)
    const newUserMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      image: userImage || undefined,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    
    // Set loading state (Thinking...)
    setIsAiProcessing(true);

    // Call AI with Context
    const response = await sendMessageToVivi(userText, userImage || undefined, context);
    
    // Start the sequential typing effect
    await processIncomingAiResponse(response.text || "", response.products);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Handle menu actions
  const handleMenuAction = (action: 'gallery' | 'camera' | 'chat', e: React.MouseEvent) => {
      // Prevent any default behavior that might steal focus
      e.preventDefault();
      e.stopPropagation();

      if (action === 'gallery') {
          setIsAttachMenuOpen(false);
          fileInputRef.current?.click();
      } else if (action === 'camera') {
          setIsAttachMenuOpen(false);
          cameraInputRef.current?.click();
      } else if (action === 'chat') {
          // KEY FIX: Explicitly switch view to chat
          setHasStartedChatting(true);

          // Focus input
          textInputRef.current?.focus();
          
          // Then close the menu after a tiny delay so the UI update doesn't kill the focus event
          setTimeout(() => {
             setIsAttachMenuOpen(false);
          }, 50);
      }
  };

  if (!hasEnteredStore) {
    return <WelcomeScreen onEnter={() => setHasEnteredStore(true)} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden animate-fade-in">
      
      {/* WISHLIST MODAL/DRAWER */}
      {isWishlistOpen && (
        <div className="absolute inset-0 z-[100] flex flex-col justify-end bg-black/50 backdrop-blur-sm transition-all">
            <div className="bg-white rounded-t-3xl h-[85%] flex flex-col shadow-2xl animate-fade-in-up">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Seus Favoritos <Heart className="fill-red-500 text-red-500" size={20} />
                        </h2>
                        <p className="text-xs text-slate-500">Salve agora, decida depois.</p>
                    </div>
                    <button onClick={() => setIsWishlistOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4">
                    {wishlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                            <Heart size={48} className="text-slate-200" />
                            <p>Sua lista está vazia.</p>
                            <button onClick={() => setIsWishlistOpen(false)} className="text-blue-600 font-bold text-sm">
                                Voltar para a loja
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {wishlist.map(p => (
                                <div key={p.id} className="flex gap-3 bg-white border border-slate-100 p-2 rounded-xl shadow-sm">
                                    <img src={p.imageUrl} className="w-20 h-20 object-contain mix-blend-multiply bg-white rounded-lg" alt={p.name} />
                                    <div className="flex flex-col flex-grow justify-center">
                                        <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{p.name}</h4>
                                        <p className="text-sm font-light text-slate-600">{p.priceEstimate}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleWishlist(p)}
                                        className="self-start p-2 text-slate-400 hover:text-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100 pb-10">
                    <label className="text-xs font-bold text-slate-600 mb-2 block uppercase">Enviar para WhatsApp</label>
                    <div className="flex gap-2">
                        <input 
                            type="tel" 
                            placeholder="(11) 99999-9999"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
                        />
                        <button 
                            onClick={sendWishlistToWhatsapp}
                            disabled={wishlist.length === 0}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-xl px-4 flex items-center justify-center transition-colors shadow-sm"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                        Enviaremos os links para você finalizar a compra com segurança.
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* MAIN SCROLLABLE AREA */}
      <main className="flex-grow flex flex-col overflow-y-auto scroll-smooth pb-4 bg-slate-100 relative">
        
        {/* Click outside logic to close menu */}
        {isAttachMenuOpen && (
            <div 
                className="absolute inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-all"
                onClick={() => setIsAttachMenuOpen(false)}
            />
        )}

        {/* STOREFRONT STATE */}
        <div className={`transition-all duration-300 ${hasStartedChatting ? 'hidden' : 'block'}`}>
             
             {/* COMPACT AMAZON/ML STYLE HEADER */}
             <div className="bg-[#131921] pb-3 pt-3 px-4 shadow-md z-10 sticky top-0">
                 {/* Top Row: Brand & Icons */}
                 <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-2">
                         <span className="font-bold text-xl tracking-tight text-white brand-font">ShopAI</span>
                         <Sparkles size={14} className="text-[#FFD814]" />
                     </div>
                     <div className="flex items-center gap-4 text-white">
                        <span className="text-xs font-bold">Favoritos</span>
                        <button 
                            onClick={() => setIsWishlistOpen(true)}
                            className="relative"
                        >
                            <ShoppingBag size={24} />
                            {wishlist.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#FFD814] text-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                    {wishlist.length}
                                </span>
                            )}
                        </button>
                     </div>
                 </div>

                 {/* HIGHLIGHT PHRASE CTA (Botão 'Falar com Vivi') */}
                 <button
                    onClick={() => {
                        setHasStartedChatting(true);
                        setTimeout(() => textInputRef.current?.focus(), 100);
                    }}
                    className="bg-white w-full rounded-lg py-2 px-3 flex items-center gap-3 shadow-md cursor-pointer active:scale-95 transition-all group"
                 >
                     <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-full text-white shadow-sm group-hover:scale-110 transition-transform">
                         <Sparkles size={16} fill="white" />
                     </div>
                     <div className="flex flex-col items-start flex-grow">
                         <span className="text-sm font-bold text-slate-800">"Vivi, me ajuda a escolher?"</span>
                         <span className="text-[10px] text-slate-500 font-medium">Toque para iniciar o chat inteligente</span>
                     </div>
                     <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100">
                          <Search size={16} className="text-slate-400" />
                     </div>
                 </button>
             </div>
            
             {/* Location Strip */}
             <div className="bg-[#232f3e] px-4 py-2 flex items-center gap-2 overflow-hidden whitespace-nowrap shadow-inner">
                <MapPin size={14} className="text-white" />
                <span className="text-xs text-white truncate">
                    Enviar para <strong>Você</strong> - Aproveite o Frete Grátis
                </span>
             </div>

             {/* Carousel */}
             <div className="mt-2">
                <ShowcaseSection 
                    products={products} 
                    isLoading={showcaseStatus === LoadingState.LOADING}
                    onProductClick={(p) => handleSendMessage(`Me conte mais sobre o ${p.name}`)}
                    wishlist={wishlist}
                    onToggleWishlist={toggleWishlist}
                />
             </div>

             {/* Categories Grid */}
             <div className="px-5 mt-2 mb-20">
                 <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Search size={18} className="text-slate-400" />
                    Categorias Populares
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                     {SUGGESTION_CHIPS.map((chip, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendMessage(chip)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left hover:border-blue-400 transition-all active:scale-95 group"
                         >
                            <span className="text-sm font-semibold text-slate-800 block group-hover:text-blue-600 transition-colors">{chip}</span>
                            <span className="text-[10px] text-slate-400 mt-2 block font-medium group-hover:text-blue-400">Ver ofertas ›</span>
                         </button>
                     ))}
                 </div>
             </div>
        </div>

        {/* CHAT STATE */}
        <div className={`flex-grow px-2 transition-all duration-300 flex flex-col ${hasStartedChatting ? 'opacity-100' : 'opacity-0 hidden'}`}>
             
             {/* Sticky Header for Chat */}
             <div className="sticky top-0 z-20 flex items-center justify-between p-3 bg-slate-100/95 backdrop-blur-md border-b border-slate-200 mb-2 shadow-sm">
                 <div className="flex items-center">
                    <button onClick={() => setHasStartedChatting(false)} className="p-2 rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="ml-3 flex flex-col">
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            Vivi <Sparkles size={10} className="text-yellow-500" />
                        </span>
                        <span className="text-[10px] text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                        </span>
                    </div>
                 </div>
                 
                 <button 
                    onClick={() => setIsWishlistOpen(true)}
                    className="p-2 bg-white rounded-full border border-slate-200 shadow-sm relative"
                 >
                     <Heart size={18} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : "text-slate-600"} />
                     {wishlist.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                     )}
                 </button>
             </div>

             <div className="flex flex-col justify-end flex-grow pb-4">
                 <div className="flex justify-center mb-6 mt-2">
                     <span className="bg-slate-200/60 text-slate-500 text-[10px] px-3 py-1 rounded-full font-medium">Hoje</span>
                 </div>

                 {messages.map((msg) => (
                   <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        wishlist={wishlist}
                        onToggleWishlist={toggleWishlist}
                   />
                 ))}
                 
                 {/* Typing Indicator */}
                 {(isAiProcessing || isAiTyping) && (
                   <div className="flex justify-start w-full mb-4 px-2 animate-fade-in-up">
                     <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                     </div>
                   </div>
                 )}
                 <div ref={messagesEndRef} />
             </div>
        </div>

      </main>

      {/* FOOTER INPUT AREA */}
      <footer className="bg-white border-t border-slate-100 px-4 py-3 shrink-0 mb-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-50">
          
          {/* POP-UP MENU */}
          {isAttachMenuOpen && (
              <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col gap-1 min-w-[160px] animate-fade-in-up origin-bottom-left">
                  <button 
                    onClick={(e) => handleMenuAction('camera', e)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-800"
                  >
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                        <Camera size={20} />
                      </div>
                      <span className="text-sm font-semibold">Tirar Foto</span>
                  </button>

                  <button 
                    onClick={(e) => handleMenuAction('gallery', e)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-800"
                  >
                      <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                        <ImageIcon size={20} />
                      </div>
                      <span className="text-sm font-semibold">Galeria</span>
                  </button>

                  <div className="h-[1px] bg-slate-100 my-0.5"></div>

                   <button 
                    onClick={(e) => handleMenuAction('chat', e)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-800"
                  >
                      <div className="bg-slate-100 p-2 rounded-full text-slate-600">
                        <MessageCircle size={20} />
                      </div>
                      <span className="text-sm font-semibold">Chat</span>
                  </button>
              </div>
          )}

          {selectedImage && (
              <div className="mb-2 relative inline-block mx-2">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded border border-slate-200" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5"
                  >
                      <X size={12} />
                  </button>
              </div>
          )}

          {isRecording ? (
            <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mx-1">
                <button onClick={() => setIsRecording(false)} className="text-red-400">
                    <X size={20} />
                </button>
                <span className="text-xs font-bold text-red-500 animate-pulse">Gravando... {formatTime(recordingTime)}</span>
                <div className="flex-grow flex items-center justify-end">
                    <button onClick={toggleRecording} className="bg-red-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm">
                        ENVIAR
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                    className={`transition-all duration-300 ${isAttachMenuOpen ? 'rotate-45 text-red-500 bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1.5 rounded-full`}
                >
                    <Plus size={28} />
                </button>

                <div className="flex-grow relative">
                    <input
                        ref={textInputRef}
                        id="chat-input"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Digite ou fale..."
                        className="w-full bg-slate-50 text-slate-800 rounded-xl pl-4 pr-10 py-3.5 border border-slate-200 outline-none focus:border-blue-400 focus:bg-white transition-all text-sm placeholder:text-slate-400"
                    />
                    <button 
                        onClick={toggleRecording}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <Mic size={20} />
                    </button>
                </div>

                <button 
                    onClick={() => handleSendMessage()}
                    disabled={(!inputValue.trim() && !selectedImage) || isAiProcessing || isAiTyping}
                    className="p-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-lg transition-all active:scale-95"
                >
                    <Send size={20} fill="currentColor" className="ml-0.5" />
                </button>
            </div>
          )}
          
          {/* Hidden Inputs */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
      </footer>
    </div>
  );
}