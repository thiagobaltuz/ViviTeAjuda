import { AFFILIATE_CONFIG } from '../constants';

/**
 * Parses text and injects affiliate tags into known e-commerce URLs.
 * Also handles markdown links [Text](url).
 */
export const injectAffiliateTags = (text: string): string => {
  if (!text) return '';

  // Improved Regex to find URLs but exclude trailing punctuation like . , or ; often found in sentences
  // Capture group 1 is the full URL
  const urlRegex = /((https?:\/\/)?(www\.)?(amazon\.com\.br|mercadolivre\.com\.br)[^\s.,;)]+)/g;

  return text.replace(urlRegex, (url) => {
    try {
      // Ensure protocol exists for URL constructor
      const urlToParse = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlToParse);
      
      if (urlObj.hostname.includes('amazon.com.br')) {
        urlObj.searchParams.set('tag', AFFILIATE_CONFIG.AMAZON_TAG);
      } else if (urlObj.hostname.includes('mercadolivre.com.br')) {
        // ML affiliate structure example
        urlObj.searchParams.set('matt_tool', 'referral');
        urlObj.searchParams.set('matt_id', AFFILIATE_CONFIG.MERCADO_LIVRE_ID);
      }
      
      const finalUrl = urlObj.toString();
      // Return an HTML anchor tag so it becomes clickable in the chat
      return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${finalUrl}</a>`;
    } catch (e) {
      // If invalid URL, return original
      return url;
    }
  });
};

/**
 * Helper to specifically format a product link for a button
 */
export const getAffiliateLink = (baseUrl: string): string => {
   try {
      const urlObj = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
      
      if (urlObj.hostname.includes('amazon')) {
        urlObj.searchParams.set('tag', AFFILIATE_CONFIG.AMAZON_TAG);
      } else if (urlObj.hostname.includes('mercadolivre')) {
         urlObj.searchParams.set('matt_id', AFFILIATE_CONFIG.MERCADO_LIVRE_ID);
      }
      
      return urlObj.toString();
    } catch (e) {
      return baseUrl;
    }
}