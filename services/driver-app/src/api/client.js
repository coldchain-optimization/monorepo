import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8085';

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function resolveDevHost() {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.developer?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    '';

  if (hostUri) {
    const host = hostUri.replace(/^.*:\/\//, '').split(':')[0].split('/')[0];
    if (host) {
      return host;
    }
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

function resolveApiBase() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl && configuredUrl.toLowerCase() !== 'auto') {
    return normalizeBaseUrl(configuredUrl);
  }

  const host = resolveDevHost();
  const normalizedHost = host === '127.0.0.1' && Platform.OS === 'android' ? '10.0.2.2' : host;

  return `http://${normalizedHost}:${DEFAULT_API_PORT}/api/v1`;
}

const API_BASE = resolveApiBase();

console.log('[API Client] Base URL:', API_BASE);

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(method, path, body) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    console.log(`[API] ${method} ${url}`, body ? JSON.stringify(body) : '');

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      console.log(`[API] Response: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data;
    } catch (e) {
      console.error('[API] Error:', e.message);
      throw e;
    }
  }

  async login(email, password) {
    return this.request('POST', '/public/auth/login', { email, password });
  }

  async getProfile() {
    return this.request('GET', '/auth/profile');
  }

  async getAvailableShipments() {
    return this.request('GET', '/shipments/available');
  }

  async searchMatches(shipmentId, limit = 10) {
    return this.request('POST', '/matching/search', {
      shipment_id: shipmentId,
      limit,
    });
  }

  async acceptMatch(payload) {
    return this.request('POST', '/matching/accept', payload);
  }

  async getBackhauling(shipmentId) {
    return this.request('GET', `/matching/backhauling/${encodeURIComponent(shipmentId)}`);
  }

  async getDriverVehicles(driverId) {
    return this.request('GET', `/drivers/${driverId}/vehicles`);
  }

  async getMyDriverProfile() {
    return this.request('GET', '/drivers/me');
  }

  async getTrackingStatus(shipmentId) {
    return this.request('GET', `/tracking/${encodeURIComponent(shipmentId)}/status`);
  }

  async getTrackingHistory(shipmentId) {
    return this.request('GET', `/tracking/${encodeURIComponent(shipmentId)}/history`);
  }

  async getStatusHistory(shipmentId) {
    return this.request('GET', `/status/${encodeURIComponent(shipmentId)}/history`);
  }

  async recordPickupEvent(shipmentId, payload) {
    return this.request('POST', `/status/${encodeURIComponent(shipmentId)}/pickup`, payload);
  }

  async recordDeliveryEvent(shipmentId, payload) {
    return this.request('POST', `/status/${encodeURIComponent(shipmentId)}/deliver`, payload);
  }

  async updateLocation(shipmentId, payload) {
    return this.request('POST', `/tracking/${encodeURIComponent(shipmentId)}/location`, payload);
  }
}

export const api = new ApiClient();
