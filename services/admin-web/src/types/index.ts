// Domain types matching Go backend models

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'shipper' | 'driver';
  created_at: string;
  updated_at: string;
}

export interface Shipper {
  id: string;
  user_id: string;
  company_name: string;
  company_address: string;
  phone_number: string;
  tax_id: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  phone_number: string;
  rating: number;
  role: 'transporting_body' | 'help_seeking_body';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: string;
  license_plate: string;
  manufacturer: string;
  model: string;
  year: number;
  capacity: number;
  max_weight: number;
  is_refrigerated: boolean;
  temperature: number;
  fuel_type: string;
  carbon_footprint: number;
  is_available: boolean;
  current_location: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  shipper_id: string;
  source_location: string;
  destination_location: string;
  load_weight: number;
  load_volume: number;
  load_type: string;
  required_temp: number;
  days_available: number;
  time_window_start: string;
  time_window_end: string;
  status: 'pending' | 'booked' | 'in_transit' | 'delivered' | 'cancelled';
  assigned_vehicle: string;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  vehicle_id: string;
  driver_id: string;
  match_score: number;
  estimated_cost: number;
  estimated_time: number;
  carbon_footprint: number;
  reasons: string[];
}

export interface KnowledgeBase {
  id: string;
  shipment_id: string;
  vehicle_id: string;
  match_score: number;
  estimated_cost: number;
  actual_cost: number;
  pricing_factor: number;
  time_factor: number;
  carbon_factor: number;
  route_metadata: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}
