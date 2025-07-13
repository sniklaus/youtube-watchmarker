/**
 * Secure credential storage for database connections
 * Uses Chrome storage with basic encryption for sensitive data
 */

/**
 * Simple encryption/decryption utility
 * Note: This is basic obfuscation. For production use, consider more robust encryption
 */
class SimpleEncryption {
  constructor() {
    // Generate a simple key based on extension ID and user agent
    this.key = this.generateKey();
  }

  generateKey() {
    const baseString = (chrome.runtime.id || 'fallback') + navigator.userAgent;
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  encrypt(text) {
    if (!text) return '';
    const key = this.key;
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const textChar = text.charCodeAt(i);
      encrypted += String.fromCharCode(textChar ^ keyChar);
    }
    return btoa(encrypted);
  }

  decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
      const encrypted = atob(encryptedText);
      const key = this.key;
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return '';
    }
  }
}

/**
 * Credential storage manager
 */
export class CredentialStorage {
  constructor() {
    this.encryption = new SimpleEncryption();
    this.storageKey = 'supabase_credentials';
  }

  /**
   * Store Supabase credentials securely
   * @param {Object} credentials - Database credentials
   * @param {string} credentials.supabaseUrl - Supabase project URL
   * @param {string} credentials.apiKey - Supabase API key (anon or service role)
   * @param {string} credentials.jwtToken - JWT token for authentication (optional)
   * @param {string} credentials.projectRef - Project reference ID
   */
  async storeCredentials(credentials) {
    try {
      // Validate required fields
      if (!credentials.supabaseUrl || !credentials.apiKey) {
        throw new Error('Invalid credentials: missing required fields (supabaseUrl, apiKey)');
      }

      // Validate URL format
      if (!credentials.supabaseUrl.includes('supabase.co') && !credentials.supabaseUrl.includes('localhost')) {
        throw new Error('Invalid Supabase URL format');
      }

      // Encrypt sensitive data
      const encryptedCredentials = {
        supabaseUrl: this.encryption.encrypt(credentials.supabaseUrl),
        apiKey: this.encryption.encrypt(credentials.apiKey),
        jwtToken: credentials.jwtToken ? this.encryption.encrypt(credentials.jwtToken) : null,
        projectRef: credentials.projectRef ? this.encryption.encrypt(credentials.projectRef) : null,
        stored_at: Date.now()
      };

      // Store in Chrome storage
      await chrome.storage.local.set({
        [this.storageKey]: encryptedCredentials
      });

      console.log('Supabase credentials stored successfully');
      return true;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt Supabase credentials
   * @returns {Object|null} Decrypted credentials or null if not found
   */
  async getCredentials() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      const encryptedCredentials = result[this.storageKey];

      if (!encryptedCredentials) {
        return null;
      }

      // Decrypt sensitive data
      const credentials = {
        supabaseUrl: encryptedCredentials.supabaseUrl ? this.encryption.decrypt(encryptedCredentials.supabaseUrl) : null,
        apiKey: encryptedCredentials.apiKey ? this.encryption.decrypt(encryptedCredentials.apiKey) : null,
        jwtToken: encryptedCredentials.jwtToken ? this.encryption.decrypt(encryptedCredentials.jwtToken) : null,
        projectRef: encryptedCredentials.projectRef ? this.encryption.decrypt(encryptedCredentials.projectRef) : null,
        stored_at: encryptedCredentials.stored_at
      };

      return credentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Test database connection with stored credentials
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('No credentials found');
      }

      if (!credentials.supabaseUrl || !credentials.apiKey) {
        throw new Error('Invalid credentials: missing URL or API key');
      }

      // Test connection with a simple request
      const response = await fetch(`${credentials.supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': credentials.apiKey,
          'Authorization': `Bearer ${credentials.jwtToken || credentials.apiKey}`
        }
      });

      if (response.ok || response.status === 404) {
        // 404 is expected for root path, but means API is reachable
        console.log('Supabase connection test successful');
        return true;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Clear stored credentials
   */
  async clearCredentials() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
      console.log('Supabase credentials cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      return false;
    }
  }

  /**
   * Check if credentials are stored
   * @returns {Promise<boolean>} True if credentials exist
   */
  async hasCredentials() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return !!result[this.storageKey];
    } catch (error) {
      console.error('Failed to check credentials:', error);
      return false;
    }
  }

  /**
   * Parse Supabase URL to extract project reference
   * @param {string} supabaseUrl - Supabase project URL
   * @returns {string|null} Project reference or null
   */
  extractProjectRef(supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      const hostname = url.hostname;
      
      // Extract project ref from hostname like "abcdefg.supabase.co"
      const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
      if (match) {
        return match[1];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract project ref:', error);
      return null;
    }
  }

  /**
   * Validate Supabase credentials format
   * @param {Object} credentials - Credentials to validate
   * @returns {Object} Validation result
   */
  validateCredentials(credentials) {
    const errors = [];
    
    if (!credentials.supabaseUrl) {
      errors.push('Supabase URL is required');
    } else if (!credentials.supabaseUrl.includes('supabase.co') && !credentials.supabaseUrl.includes('localhost')) {
      errors.push('Invalid Supabase URL format');
    }
    
    if (!credentials.apiKey) {
      errors.push('API Key is required');
    } else if (credentials.apiKey.length < 20) {
      errors.push('API Key appears to be too short');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
export const credentialStorage = new CredentialStorage(); 