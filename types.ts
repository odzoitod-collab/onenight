export interface Review {
  id: string;
  author: string;
  text: string;
  rating: number;
  date: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  height: number; // cm
  weight: number; // kg
  bust: number;
  price: number; // Rubles
  description: string;
  services: string[];
  images: string[];
  isTop?: boolean;
  isVerified?: boolean;
  reviews: Review[];
}

export interface FilterState {
  city: string;
  minAge: number;
  maxAge: number;
  minHeight: number;
  maxHeight: number;
  minWeight: number;
  maxWeight: number;
  minBust: number;
  services: string[];
}

export type ViewState = 'HOME' | 'FAVORITES' | 'MORE' | 'PROFILE' | 'BOOKING' | 'CONFIRMATION';

export interface BookingData {
  serviceTypes: string[];
  duration: string;
  date: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}