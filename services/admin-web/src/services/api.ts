import axios, { type AxiosInstance } from "axios";
import type {
  AuthResponse,
  LoginInput,
  SignupInput,
  User,
  Shipper,
  Driver,
  Vehicle,
  Shipment,
  MatchResult,
  KnowledgeBase,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8085/api/v1";
const ML_API_BASE = import.meta.env.VITE_ML_API_URL || "http://localhost:5000";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: { "Content-Type": "application/json" },
    });

    // Attach JWT token to every request
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(err);
      },
    );
  }

  // ── Auth ──────────────────────────────────────────────
  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await this.client.post("/public/auth/login", data);
    return res.data;
  }

  async signup(data: SignupInput): Promise<AuthResponse> {
    const res = await this.client.post("/public/auth/signup", data);
    return res.data;
  }

  async getProfile(): Promise<User> {
    const res = await this.client.get("/auth/profile");
    // Backend returns { user: User } or just User
    return res.data.user || res.data;
  }

  // ── Admin endpoints ──────────────────────────────────
  async getStats(): Promise<Record<string, number>> {
    const res = await this.client.get("/admin/stats");
    return res.data.stats || {};
  }

  async getAllUsers(): Promise<User[]> {
    const res = await this.client.get("/admin/users");
    if (Array.isArray(res.data)) return res.data;
    return res.data.users || [];
  }

  async getAllShipments(): Promise<Shipment[]> {
    const res = await this.client.get("/admin/shipments");
    if (Array.isArray(res.data)) return res.data;
    return res.data.shipments || [];
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    const res = await this.client.get("/admin/vehicles");
    if (Array.isArray(res.data)) return res.data;
    return res.data.vehicles || [];
  }

  async getAllDrivers(): Promise<Driver[]> {
    const res = await this.client.get("/admin/drivers");
    if (Array.isArray(res.data)) return res.data;
    return res.data.drivers || [];
  }

  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    const res = await this.client.get("/admin/knowledge-base");
    if (Array.isArray(res.data)) return res.data;
    return res.data.entries || [];
  }

  // ── Shippers ─────────────────────────────────────────
  async registerShipper(data: Partial<Shipper>): Promise<Shipper> {
    const res = await this.client.post("/shippers/register", data);
    return res.data;
  }

  async getMyShipper(): Promise<Shipper> {
    const res = await this.client.get("/shippers/me");
    return res.data;
  }

  // ── Shipments ────────────────────────────────────────
  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    const res = await this.client.post("/shipments", data);
    return res.data;
  }

  async getShipment(id: string): Promise<Shipment> {
    const res = await this.client.get(`/shipments/${id}`);
    return res.data;
  }

  async updateShipment(id: string, data: Partial<Shipment>): Promise<Shipment> {
    const res = await this.client.put(`/shipments/${id}`, data);
    return res.data;
  }

  async deleteShipment(id: string): Promise<void> {
    await this.client.delete(`/shipments/${id}`);
  }

  async getShipmentMatches(id: string): Promise<MatchResult[]> {
    const res = await this.client.get(`/shipments/${id}/matches`);
    if (Array.isArray(res.data)) return res.data;
    return res.data.matches || [];
  }

  async getShipmentBestMatch(id: string): Promise<MatchResult> {
    const res = await this.client.get(`/shipments/${id}/best-match`);
    return res.data;
  }

  // ── ML Service ───────────────────────────────────────
  async optimizeMatch(
    shipment: Shipment,
    vehicle: Vehicle,
    match: MatchResult,
  ): Promise<any> {
    const res = await axios.post(`${ML_API_BASE}/optimize`, {
      rule_score: match.match_score || 70,
      shipment: {
        id: shipment.id,
        load_weight: shipment.load_weight,
        load_volume: shipment.load_volume || 10,
        required_temp: shipment.required_temp,
        load_type: shipment.load_type,
        days_available: shipment.days_available || 2,
      },
      vehicle: {
        id: vehicle.id,
        capacity: vehicle.capacity,
        max_weight: vehicle.max_weight,
        is_refrigerated: vehicle.is_refrigerated,
        temperature: vehicle.temperature,
        carbon_footprint: vehicle.carbon_footprint,
      },
      route: {
        distance_km: match.pricing_breakdown?.distance || 300,
        estimated_time: match.estimated_time || 480,
        carbon_kg: match.carbon_footprint || 50,
        cost_estimate: match.estimated_cost || 1500,
      },
    });
    return res.data;
  }

  // ── Vehicles ─────────────────────────────────────────
  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await this.client.post("/vehicles", data);
    return res.data;
  }

  async getVehicle(id: string): Promise<Vehicle> {
    const res = await this.client.get(`/vehicles/${id}`);
    return res.data;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await this.client.put(`/vehicles/${id}`, data);
    return res.data;
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.client.delete(`/vehicles/${id}`);
  }

  async getAvailableVehicles(): Promise<Vehicle[]> {
    const res = await this.client.get("/vehicles/available");
    if (Array.isArray(res.data)) return res.data;
    return res.data.vehicles || [];
  }

  // ── Drivers ──────────────────────────────────────────
  async registerDriver(data: Partial<Driver>): Promise<Driver> {
    const res = await this.client.post("/drivers", data);
    return res.data;
  }

  async getMyDriver(): Promise<Driver> {
    const res = await this.client.get("/drivers/me");
    return res.data;
  }

  async getDriver(id: string): Promise<Driver> {
    const res = await this.client.get(`/drivers/${id}`);
    return res.data;
  }

  async getDriverVehicles(id: string): Promise<Vehicle[]> {
    const res = await this.client.get(`/drivers/${id}/vehicles`);
    if (Array.isArray(res.data)) return res.data;
    return res.data.vehicles || [];
  }

  // ── Matching ─────────────────────────────────────────
  async searchMatches(shipmentId: string): Promise<MatchResult[]> {
    const res = await this.client.post("/matching/search", {
      shipment_id: shipmentId,
    });
    if (Array.isArray(res.data)) return res.data;
    return res.data.matches || [];
  }

  async acceptMatch(
    shipmentId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<unknown> {
    const res = await this.client.post("/matching/accept", {
      shipment_id: shipmentId,
      vehicle_id: vehicleId,
      driver_id: driverId,
    });
    return res.data;
  }

  async submitFeedback(data: {
    shipment_id: string;
    vehicle_id: string;
    actual_cost: number;
    rating: number;
    feedback: string;
  }): Promise<unknown> {
    const res = await this.client.post("/matching/feedback", data);
    return res.data;
  }

  async getBackhauling(shipmentId: string): Promise<unknown> {
    const res = await this.client.get(`/matching/backhauling/${shipmentId}`);
    return res.data;
  }

  // ── Tracking ─────────────────────────────────────────
  async getTrackingStatus(shipmentId: string): Promise<unknown> {
    const res = await this.client.get(`/tracking/${shipmentId}/status`);
    return res.data;
  }

  async getTrackingHistory(shipmentId: string): Promise<unknown> {
    const res = await this.client.get(`/tracking/${shipmentId}/history`);
    return res.data;
  }

  // ── Health ───────────────────────────────────────────
  async healthCheck(): Promise<{ status: string }> {
    const healthBase = API_BASE.replace(/\/api\/v1\/?$/, "");
    const res = await axios.get(`${healthBase}/health`);
    return res.data;
  }
}

export const api = new ApiClient();
