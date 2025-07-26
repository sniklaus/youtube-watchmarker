/**
 * Secure credential storage for database connections
 * Uses Chrome storage with AES-GCM encryption for sensitive data
 */

/**
 * Production-level encryption utility using Web Crypto API
 * Uses AES-GCM with PBKDF2 key derivation for maximum security
 */
class WebEncryption {
  constructor() {
    // Generate a unique salt for this extension instance
    this.masterSalt = null;
    this.initialized = false;
  }

  /**
   * Initialize the encryption system with a master salt
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Try to get existing salt from storage
      const result = await chrome.storage.local.get(['encryption_salt']);
      
      if (result.encryption_salt) {
        this.masterSalt = new Uint8Array(result.encryption_salt);
      } else {
        // Generate new salt and store it
        this.masterSalt = crypto.getRandomValues(new Uint8Array(32));
        await chrome.storage.local.set({
          encryption_salt: Array.from(this.masterSalt)
        });
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Generate a cryptographic key from the extension ID and user agent
   * Uses PBKDF2 for secure key derivation
   */
  async deriveKey() {
    await this.initialize();

    // Create key material from extension ID and user agent (stable across sessions)
    const keyMaterial = (chrome.runtime.id || 'fallback') + navigator.userAgent;
    const encoder = new TextEncoder();
    const keyMaterialBuffer = encoder.encode(keyMaterial);

    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterialBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.masterSalt,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256'
      },
      importedKey,
      {
        name: 'AES-GCM',
        length: 256 // 256-bit key
      },
      false, // Key is not extractable
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Encrypt text using AES-GCM
   * @param {string} text - Text to encrypt
   * @returns {string} Base64 encoded encrypted data with IV
   */
  async encrypt(text) {
    if (!text) return '';

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
      
      // Get the encryption key
      const key = await this.deriveKey();
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt AES-GCM encrypted text
   * @param {string} encryptedText - Base64 encoded encrypted data with IV
   * @returns {string} Decrypted text
   */
  async decrypt(encryptedText) {
    if (!encryptedText) return '';

    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Get the decryption key
      const key = await this.deriveKey();

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      // Convert back to text
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

}

/**
 * Credential storage manager
 */
export class CredentialStorage {
  constructor() {
    this.encryption = new WebEncryption();
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
        supabaseUrl: await this.encryption.encrypt(credentials.supabaseUrl),
        apiKey: await this.encryption.encrypt(credentials.apiKey),
        jwtToken: credentials.jwtToken ? await this.encryption.encrypt(credentials.jwtToken) : null,
        projectRef: credentials.projectRef ? await this.encryption.encrypt(credentials.projectRef) : null,
        stored_at: Date.now()
      };

      // Store in Chrome storage
      await chrome.storage.local.set({
        [this.storageKey]: encryptedCredentials
      });

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
        supabaseUrl: await this.encryption.decrypt(encryptedCredentials.supabaseUrl),
        apiKey: await this.encryption.decrypt(encryptedCredentials.apiKey),
        jwtToken: encryptedCredentials.jwtToken ? await this.encryption.decrypt(encryptedCredentials.jwtToken) : null,
        projectRef: encryptedCredentials.projectRef ? await this.encryption.decrypt(encryptedCredentials.projectRef) : null,
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

  /**
   * Get masked credentials for display purposes
   * @returns {Object|null} Masked credentials or null if not found
   */
  async getMaskedCredentials() {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        return null;
      }

      // Return masked versions of sensitive data
      return {
        supabaseUrl: credentials.supabaseUrl,
        apiKey: this.maskSensitiveValue(credentials.apiKey),
        jwtToken: credentials.jwtToken ? this.maskSensitiveValue(credentials.jwtToken) : null,
        projectRef: credentials.projectRef ? this.maskSensitiveValue(credentials.projectRef) : null,
        stored_at: credentials.stored_at
      };
    } catch (error) {
      console.error('Failed to retrieve masked credentials:', error);
      return null;
    }
  }

  /**
   * Mask sensitive values for display
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  maskSensitiveValue(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }
    
    if (value.length <= 8) {
      return '***';
    }
    
    // Show first 4 and last 4 characters, mask the middle
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    const middle = '*'.repeat(Math.min(value.length - 8, 20)); // Limit mask length
    
    return `${start}${middle}${end}`;
  }

  /**
   * Get credential status for display
   * @returns {Object} Status information
   */
  async getCredentialStatus() {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        return {
          configured: false,
          hasUrl: false,
          hasApiKey: false,
          hasJwtToken: false,
          storedAt: null
        };
      }

      return {
        configured: true,
        hasUrl: !!credentials.supabaseUrl,
        hasApiKey: !!credentials.apiKey,
        hasJwtToken: !!credentials.jwtToken,
        storedAt: credentials.stored_at ? new Date(credentials.stored_at) : null
      };
    } catch (error) {
      console.error('Failed to get credential status:', error);
      return {
        configured: false,
        hasUrl: false,
        hasApiKey: false,
        hasJwtToken: false,
        storedAt: null
      };
    }
  }
}

// Create singleton instance
export const credentialStorage = new CredentialStorage(); 