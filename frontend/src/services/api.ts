import { InteractionEvent } from '../utils/interactionTracker';

// Use Vite environment variable for API base URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'https://codesight-crowdsource-collector-production.up.railway.app/api';

export interface WorkerRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  country: string;
  experience: string;
  paypalEmail: string;
  timezone: string;
  availability: string[];
}

export interface SessionData {
  workerId: string;
  scenario: string;
  duration: number;
  interactionEvents: InteractionEvent[];
  extensionData?: any; // Precise clicks from browser extension
  videoFileKey?: string;
  audioFileKey?: string;
  sessionId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Worker registration
  async registerWorker(workerData: WorkerRegistrationData): Promise<ApiResponse<{ workerId: string }>> {
    return this.makeRequest<{ workerId: string }>('/workers/register', {
      method: 'POST',
      body: JSON.stringify(workerData),
    });
  }

  // Get signed URL for file upload
  async getUploadUrl(fileType: 'video' | 'audio', fileName: string, workerId: string): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
    return this.makeRequest<{ uploadUrl: string; fileKey: string }>('/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ fileType, fileName, workerId }),
    });
  }

  // Upload file to S3 using signed URL
  async uploadFile(signedUrl: string, file: Blob, progressCallback?: (progress: number) => void): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && progressCallback) {
          const progress = (event.loaded / event.total) * 100;
          progressCallback(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Create session record
  async createSession(sessionData: SessionData): Promise<ApiResponse<{ sessionId: string }>> {
    return this.makeRequest<{ sessionId: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Get worker sessions
  async getWorkerSessions(workerId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/workers/${workerId}/sessions`);
  }

  // Get extension data for session
  async getExtensionData(sessionId: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/extension/sessions/${sessionId}/data`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.makeRequest<{ status: string }>('/health');
  }
}

export const apiService = new ApiService();