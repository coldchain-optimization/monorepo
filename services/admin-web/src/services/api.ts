import axios, { type AxiosInstance } from 'axios';
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
} from '../types';

const API_BASE = 'http://localhost:8080/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach JWT token to every request
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
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
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    );
  }

  // ── Auth ──────────────────────────────────────────────
  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await this.client.post('/public/auth/login', data);
    return res.data;
  }

  async signup(data: SignupInput): Promise<AuthResponse> {
    const res = await this.client.post('/public/auth/signup', data);
    return res.data;
  }

  async getProfile(): Promise<User> {
    const res = await this.client.get('/auth/profile');
    return res.data;
  }

  // ── Admin endpoints ──────────────────────────────────
  async getStats(): Promise<Record<string, number>> {
    const res = await this.client.get('/admin/stats');
    return res.data;
  }

  async getAllUsers(): Promise<User[]> {
    const res = await this.client.get('/admin/users');
    return res.data;
  }

  async getAllShipments(): Promise<Shipment[]> {
    const res = await this.client.get('/admin/shipments');
    return res.data;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    const res = await this.client.get('/admin/vehicles');
    return res.data;
  }

  async getAllDrivers(): Promise<Driver[]> {
    const res = await this.client.get('/admin/drivers');
    return res.data;
  }

  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    const res = await this.client.get('/admin/knowledge-base');
    return res.data;
  }

  // ── Shippers ─────────────────────────────────────────
  async registerShipper(data: Partial<Shipper>): Promise<Shipper> {
    const res = await this.client.post('/shippers/register', data);
    return res.data;
  }

  async getMyShipper(): Promise<Shipper> {
    const res = await this.client.get('/shippers/me');
    return res.data;
  }

  // ── Shipments ────────────────────────────────────────
  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    const res = await this.client.post('/shipments', data);
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
    return res.data;
  }

  async getShipmentBestMatch(id: string): Promise<MatchResult> {
    const res = await this.client.get(`/shipments/${id}/best-match`);
    return res.data;
  }

  // ── Vehicles ─────────────────────────────────────────
  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await this.client.post('/vehicles', data);
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
    const res = await this.client.get('/vehicles/available');
    return res.data;
  }

  // ── Drivers ──────────────────────────────────────────
  async registerDriver(data: Partial<Driver>): Promise<Driver> {
    const res = await this.client.post('/drivers', data);
    return res.data;
  }

  async getMyDriver(): Promise<Driver> {
    const res = await this.client.get('/drivers/me');
    return res.data;
  }

  async getDriver(id: string): Promise<Driver> {
    const res = await this.client.get(`/drivers/${id}`);
    return res.data;
  }

  async getDriverVehicles(id: string): Promise<Vehicle[]> {
    const res = await this.client.get(`/drivers/${id}/vehicles`);
    return res.data;
  }

  // ── Matching ─────────────────────────────────────────
  async searchMatches(shipmentId: string): Promise<MatchResult[]> {
    const res = await this.client.post('/matching/search', { shipment_id: shipmentId });
    return res.data;
  }

  async acceptMatch(shipmentId: string, vehicleId: string): Promise<unknown> {
    const res = await this.client.post('/matching/accept', {
      shipment_id: shipmentId,
      vehicle_id: vehicleId,
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
    const res = await this.client.post('/matching/feedback', data);
    return res.data;
  }

  async getBackhauling(shipmentId: string): Promise<unknown> {
    const res = await this.client.get(`/matching/backhauling/${shipmentId}`);
    return res.data;
  }

  // ── Health ───────────────────────────────────────────
  async healthCheck(): Promise<{ status: string }> {
    const res = await this.client.get('/health');
    return res.data;
  }
}

export const api = new ApiClient();
