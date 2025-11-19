/**
 * Generate a simple barcode for products
 * Format: CATEGORY-TIMESTAMP-RANDOM
 */
export function generateBarcode(productName: string, userId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validate barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode || barcode.length < 3) return false;
  
  // Allow alphanumeric and hyphens
  return /^[A-Z0-9-]+$/i.test(barcode);
}

/**
 * Format barcode for display (add spaces for readability)
 */
export function formatBarcodeDisplay(barcode: string): string {
  if (!barcode) return '';
  
  // Add space every 4 characters for readability
  return barcode.match(/.{1,4}/g)?.join(' ') || barcode;
}

/**
 * Generate Code128 barcode image using Canvas API
 * Returns a data URL (PNG format)
 */
export function generateBarcodeImage(barcode: string, width = 300, height = 100): string {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Draw barcode bars (simplified Code128 simulation)
  ctx.fillStyle = 'black';
  
  const barWidth = 2;
  const barHeight = height * 0.6;
  const startY = height * 0.1;
  
  // Convert barcode to simple pattern
  let x = 20;
  for (let i = 0; i < barcode.length; i++) {
    const charCode = barcode.charCodeAt(i);
    const barCount = (charCode % 4) + 1;
    
    for (let j = 0; j < barCount; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(x, startY, barWidth, barHeight);
      }
      x += barWidth;
    }
    x += barWidth;
  }
  
  // Draw text below barcode
  ctx.fillStyle = 'black';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(barcode, width / 2, height * 0.85);
  
  return canvas.toDataURL('image/png');
}

/**
 * Generate barcode SVG (alternative to canvas)
 */
export function generateBarcodeSVG(barcode: string, width = 300, height = 100): string {
  // Simple bar pattern generation
  let bars = '';
  let x = 20;
  const barWidth = 2;
  const barHeight = height * 0.6;
  const startY = height * 0.1;
  
  for (let i = 0; i < barcode.length; i++) {
    const charCode = barcode.charCodeAt(i);
    const barCount = (charCode % 4) + 1;
    
    for (let j = 0; j < barCount; j++) {
      if ((i + j) % 2 === 0) {
        bars += `<rect x="${x}" y="${startY}" width="${barWidth}" height="${barHeight}" fill="black"/>`;
      }
      x += barWidth;
    }
    x += barWidth;
  }
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      ${bars}
      <text x="50%" y="85%" font-family="monospace" font-size="14" text-anchor="middle" fill="black">
        ${barcode}
      </text>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/**
 * Sanitize barcode input (remove special characters)
 */
export function sanitizeBarcode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/**
 * Check if input matches barcode scanner pattern
 * Barcode scanners typically input very fast (< 100ms per character)
 */
export function isBarcodeScanner(inputSpeed: number): boolean {
  // If average time per character is less than 50ms, likely a barcode scanner
  return inputSpeed < 50;
}
