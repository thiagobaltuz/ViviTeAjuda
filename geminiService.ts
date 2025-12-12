import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Product } from '../types';
import { INITIAL_SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

const SHOWCASE_CACHE_KEY = 'shopai_showcase_v1';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

// Helper to ensure we always have a valid link
const generateFallbackLink = (productName: string) => {
    return `https://www.amazon.com.br/s?k=${encodeURIComponent(productName)}`;
};

// Retry Helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async <T>(operation: () => Promise<T>, retries = 2, delay = 2000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        
        const status = error.status || error.code || 0;
        const msg = (error.message || "").toLowerCase();
        
        // CRITICAL: If Quota is Exceeded, DO NOT RETRY. It will not succeed.
        // 429 RESOURCE_EXHAUSTED is the code for quota limits.
        if (msg.includes('quota') || msg.includes('exhausted') || status === 429) {
            console.error("Gemini Quota Exceeded. Stopping retries.");
            throw error; // Throw immediately to be caught by the fallback mechanism
        }
        
        // 503: Service Unavailable (Retry this)
        if (status === 503 || msg.includes('overloaded')) {
            console.warn(`Gemini API Busy (Status: ${status}). Retrying in ${delay}ms...`);
            await sleep(delay);
            return retryOperation(operation, retries - 1, delay * 2);
        }
        
        throw error;
    }
};

const FALLBACK_PRODUCTS: Product[] = [
    {
        id: "fb1",
        name: "Echo Dot 5ª Geração | Smart Speaker com Alexa",
        description: "O smart speaker com Alexa de maior sucesso. Design compacto com som ainda melhor.",
        productUrl: "https://www.amazon.com.br/dp/B09B8YGSP5",
        priceEstimate: "R$ 407,00",
        imageUrl: "https://m.media-amazon.com/images/I/71JD1K-lJHL._AC_SL1000_.jpg",
        category: "Eletrônicos",
        pitch: "Sua casa inteligente começa aqui. Controle tudo com a voz!",
        rating: 4.8,
        reviewCount: 15400
    },
    {
        id: "fb2",
        name: "Kindle 11ª Geração - Mais leve e compacto",
        description: "Tela de alta resolução de 300 ppi para textos e imagens nítidos.",
        productUrl: "https://www.amazon.com.br/dp/B09SWW583J",
        priceEstimate: "R$ 474,00",
        imageUrl: "https://m.media-amazon.com/images/I/71B1wF4d1vL._AC_SL1500_.jpg",
        category: "Eletrônicos",
        pitch: "Leve milhares de livros na mochila sem pesar nada.",
        rating: 4.8,
        reviewCount: 22000
    },
     {
        id: "fb3",
        name: "Fritadeira Sem Óleo Air Fryer Mondial 4L",
        description: "Fritadeira Sem Óleo Family Inox. Praticidade e rapidez na cozinha.",
        productUrl: "https://www.amazon.com.br/dp/B07RDMJ6P8",
        priceEstimate: "R$ 329,00",
        imageUrl: "https://m.media-amazon.com/images/I/71nZ+0Kj+1L._AC_SL1500_.jpg",
        category: "Casa",
        pitch: "Comida crocante e saudável em minutos. Essencial!",
        rating: 4.7,
        reviewCount: 8500
    },
    {
        id: "fb4",
        name: "Robô Aspirador WAP ROBOT W100",
        description: "Aspira, varre e passa pano. Bateria recarregável e bivolt.",
        productUrl: "https://www.amazon.com.br/dp/B07X94C4F4",
        priceEstimate: "R$ 399,90",
        imageUrl: "https://m.media-amazon.com/images/I/517wJ+uV2LL._AC_SL1000_.jpg",
        category: "Casa",
        pitch: "Deixe ele limpar enquanto você descansa. O melhor custo-benefício.",
        rating: 4.4,
        reviewCount: 12000
    }
];

// 1. Service to generate the initial "Showcase" of 10 items
export const generateShowcaseProducts = async (): Promise<Product[]> => {
  // --- CACHE STRATEGY START ---
  try {
      const cachedData = localStorage.getItem(SHOWCASE_CACHE_KEY);
      if (cachedData) {
          const { products, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          // Return cached if younger than 24 hours
          if (age < CACHE_DURATION_MS && products.length > 0) {
              console.log("Using cached showcase products");
              return products;
          }
      }
  } catch (e) {
      console.warn("Error reading showcase cache", e);
  }
  // --- CACHE STRATEGY END ---

  const modelId = "gemini-2.5-flash";
  
  const prompt = `
    Atue como um sistema da Amazon/Mercado Livre.
    Gere uma lista JSON de 10 produtos "Best Sellers" variados (Eletrônicos, Casa, Moda).
    
    Para cada produto:
    - 'pitch': Uma frase curta de venda estilo Polishop/Vivi.
    - 'rating': Número 3.5 a 5.0.
    - 'reviewCount': Inteiro aleatório.
    - 'priceEstimate': Formato "R$ 00,00".
    - 'productUrl': Gere um link de busca da Amazon para o produto.
  `;

  try {
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: "Você é um gerador de dados. Retorne apenas JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                productUrl: { type: Type.STRING },
                priceEstimate: { type: Type.STRING },
                category: { type: Type.STRING },
                pitch: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviewCount: { type: Type.INTEGER }
              },
              required: ["id", "name", "priceEstimate", "pitch"]
            }
          }
        }
      }));

      const rawProducts = JSON.parse(response.text || "[]");
      
      const processedProducts = rawProducts.map((p: any, index: number) => ({
        ...p,
        priceEstimate: p.priceEstimate || "R$ 0,00",
        description: p.description || p.pitch, // Fallback description
        productUrl: p.productUrl || generateFallbackLink(p.name),
        // Ensure we have an image if the model didn't generate one
        imageUrl: p.imageUrl || `https://picsum.photos/400/400?random=${index + 500}`
      }));

      // Save to cache
      localStorage.setItem(SHOWCASE_CACHE_KEY, JSON.stringify({
          products: processedProducts,
          timestamp: Date.now()
      }));

      return processedProducts;

  } catch (error) {
    console.error("Failed to generate showcase, using fallback data:", error);
    // Return fallback data on error (429 or others)
    return FALLBACK_PRODUCTS;
  }
};

// 2. Chat Service
let chatSession: any = null;

export const sendMessageToVivi = async (message: string, base64Image?: string, previousContext?: string): Promise<{ text: string, products?: Product[] }> => {
  const modelId = "gemini-2.5-flash";

  // Always try to init session if null
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: INITIAL_SYSTEM_INSTRUCTION,
        // Removed googleSearch to optimize costs and prevent 429 quota errors
        tools: [], 
      }
    });
  }

  try {
    let result;
    
    // Inject context if provided (Fixes the automation vs AI memory gap)
    let finalMessageText = message || "Olá";
    if (previousContext) {
        finalMessageText = `(Contexto Visual anterior: "${previousContext}")\n\nResposta do Usuário: ${message}`;
    }

    // Force style compliance in every turn based on Funnel V3
    finalMessageText += `\n\n[SISTEMA]: ATENÇÃO VIVI!
    1. Siga o FUNIL V3 (Acolhimento -> Contexto -> Curadoria -> Comparação -> Opinião).
    2. NÃO seja robótica ou seca. Use Storytelling nos balões de texto.
    3. Se houver produtos, COMPARE-OS e dê sua opinião pessoal ("Se fosse pra mim...").
    4. Use '|||' para separar parágrafos de fala.`;

    const msgContent: any[] = [{ text: finalMessageText }];

    if (base64Image) {
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      msgContent.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
      });
    }

    // Wrap the chat message in retry
    // Explicitly casting result to any or GenerateContentResponse to allow text access safely if strict
    result = await retryOperation<GenerateContentResponse>(() => chatSession.sendMessage({ message: msgContent }));
    
    const rawText = result.text || "";
    
    // Robust JSON extraction since we can't force JSON mode
    // Look for the first '{' and the last '}' to handle potential markdown wrapping
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    
    let parsedData;
    if (jsonMatch) {
        try {
            parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse extracted JSON", e);
            throw new Error("Invalid JSON format");
        }
    } else {
        // Fallback if model refused to output JSON (rare with system prompt)
        parsedData = { message: rawText, products: [] };
    }

    // Post-process products to ensure they have valid-looking images for the UI
    const processedProducts = (parsedData.products || []).map((p: any, idx: number) => ({
        ...p,
        // Ensure priceEstimate exists
        priceEstimate: p.priceEstimate || "R$ 0,00",
        description: p.description || p.pitch || "Produto incrível selecionado pela Vivi.",
        // Fallback image logic if the search didn't return a valid image URL
        imageUrl: (p.imageUrl && p.imageUrl.startsWith('http')) 
            ? p.imageUrl 
            : `https://source.unsplash.com/400x400/?${encodeURIComponent(p.name)}`
    }));

    const finalProducts = processedProducts.map((p: any) => {
         // Generate a robust link if missing
         const finalLink = p.productUrl && p.productUrl.startsWith('http') 
            ? p.productUrl 
            : generateFallbackLink(p.name);

         let finalImage = p.imageUrl;
         if (finalImage.includes('unsplash')) {
             finalImage = `https://picsum.photos/400/400?random=${p.name.length + Date.now()}`;
         }
         
         return { ...p, productUrl: finalLink, imageUrl: finalImage };
    });

    return { 
        text: parsedData.message, 
        products: finalProducts
    };

  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    
    const status = error.status || error.code || 0;
    const msg = (error.message || "").toLowerCase();
    
    // Check specifically for Quota/Rate Limits
    if (status === 429 || msg.includes('quota') || msg.includes('429')) {
        return { 
          text: "Ops! Atingi meu limite de atendimentos gratuitos por hoje (Cota Excedida do Google). 🚦\n\nComo sou uma versão de demonstração, preciso esperar a cota renovar. Tente novamente amanhã ou verifique seu plano.", 
          products: [] 
        };
    }

    return { 
      text: "Ops, deu um soluço técnico aqui! 😅 Pode repetir?", 
      products: [] 
    };
  }
};