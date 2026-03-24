// Base URL for the backend API.
// On Android Emulator, use 10.0.2.2 to reach your local machine.
// On a physical device, use your machine's local IP address (e.g., 192.168.x.x).
const BASE_URL = 'http://10.0.2.2:5000/api';

export const api = {
  /**
   * Fetch all skills from the backend.
   */
  getSkills: async (): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/skills`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new skill on the backend.
   */
  createSkill: async (skillData: object): Promise<any> => {
    const response = await fetch(`${BASE_URL}/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(skillData),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to create skill');
    }
    return response.json();
  },

  /**
   * Register a new user.
   */
  register: async (name: string, email: string, password: string): Promise<any> => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, password}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  /**
   * Login an existing user.
   */
  login: async (email: string, password: string): Promise<any> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    return data;
  },
};
