export interface Product {
  id: string;
  name: string;
  description: string; // Text description of the product features
  productUrl: string; // The actual buy link
  priceEstimate: string;
  imageUrl: string;
  category: string;
  pitch: string; // The "Polishop" style pitch
  rating?: number; // Added rating for Amazon look
  reviewCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  products?: Product[]; 
  image?: string; // Base64 string for user uploaded images
  timestamp: Date;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}