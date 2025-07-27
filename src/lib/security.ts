// Security utility functions

/**
 * Escapes HTML characters to prevent XSS attacks
 */
export const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes user input by trimming and limiting length
 */
export const sanitizeInput = (input: string, maxLength: number = 200): string => {
  if (typeof input !== 'string') return '';
  
  return escapeHtml(input.trim().substring(0, maxLength));
};

/**
 * Validates file size
 */
export const validateFileSize = (file: File | Blob, maxSizeMB: number = 50): boolean => {
  const maxSize = maxSizeMB * 1024 * 1024;
  return file.size <= maxSize;
};

/**
 * Validates audio file type
 */
export const validateAudioType = (file: File | Blob): boolean => {
  return file.type.startsWith('audio/');
};

/**
 * Validates audio file content by checking file signatures
 */
export const validateAudioContent = async (file: File | Blob): Promise<boolean> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check for common audio file signatures
    const isValidAudio = 
      // WebM signature
      (uint8Array[0] === 0x1A && uint8Array[1] === 0x45 && uint8Array[2] === 0xDF && uint8Array[3] === 0xA3) ||
      // OGG signature
      (uint8Array[0] === 0x4F && uint8Array[1] === 0x67 && uint8Array[2] === 0x67 && uint8Array[3] === 0x53) ||
      // MP3 signature
      (uint8Array[0] === 0xFF && (uint8Array[1] & 0xF0) === 0xF0) ||
      // WAV signature
      (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46);

    return isValidAudio;
  } catch {
    return false;
  }
};

/**
 * Rate limiting helper for client-side usage
 */
export const isRateLimited = (
  lastRequestTime: number | null, 
  minIntervalMs: number = 5000
): boolean => {
  if (!lastRequestTime) return false;
  
  const now = Date.now();
  return (now - lastRequestTime) < minIntervalMs;
};

/**
 * Generates a secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return result;
};