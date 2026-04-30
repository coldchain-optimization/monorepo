// Domain types matching Go backend models

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "shipper" | "driver";
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
  role: "transporting_body" | "help_seeking_body";
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
  status: "pending" | "booked" | "in_transit" | "delivered" | "cancelled";
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
  rule_score?: number;
  ml_score?: number;
  score_source?: "rules" | "hybrid" | string;
  confidence?: number; // 0-1: model confidence in ML prediction
  explanation?: string; // Domain-specific reason for score
  estimated_cost: number;
  estimated_time: number;
  carbon_footprint: number;
  reasons: string[];
  pricing_breakdown?: PricingBreak;
  score_details?: ScoreDetails;
}

export interface SharedTenant {
  shipper_id: string;
  source_location: string;
  destination_location: string;
  shapley_allocated_cost: number;
}

export interface PricingBreak {
  base_rate: number;
  distance: number;
  distance_cost: number;
  refrigeration_cost: number;
  deviation_cost: number;
  consolidation_savings: number;
  total: number;
  fuel_cost?: number;
  driver_cost?: number;
  toll_cost?: number;
  base_cost?: number;
  alpha_demand?: number;
  beta_backhaul?: number;
  gamma_dwell?: number;
  delta_time?: number;
  trip_price_rs?: number;
  oracle_price?: number;
  price_per_ton_km?: number;
  toll_plazas?: number;
  my_shapley_cost?: number;
  my_original_cost?: number;
  shared_tenants?: SharedTenant[];
}

export interface ScoreDetails {
  route_overlap: number;
  temp_match: number;
  capacity_fit: number;
  time_match: number;
  distance_deviation: number;
  final_score: number;
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
