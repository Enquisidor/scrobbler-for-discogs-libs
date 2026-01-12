/**
 * Platform-agnostic crypto interface
 * Implementations provided by web and mobile apps
 */
export interface CryptoAdapter {
    /**
     * Generate HMAC-SHA1 signature (for Discogs OAuth 1.0a)
     */
    hmacSha1Base64(message: string, key: string): string | Promise<string>;
    /**
     * Generate MD5 hash (for Last.fm API signatures)
     */
    md5(message: string): string | Promise<string>;
    /**
     * RFC 3986 URL encoding (for OAuth)
     */
    rfc3986encode(str: string): string;
}
