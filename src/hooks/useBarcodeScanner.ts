import { useEffect, useRef } from 'react';

interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  timeout?: number;
}

/**
 * Custom hook for handling barcode scanner input
 * Detects rapid keyboard input typical of barcode scanners
 */
export function useBarcodeScanner({ onScan, enabled = true, timeout = 100 }: UseBarcodeScanner) {
  const barcodeBuffer = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (except our barcode input)
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      const isBarcodeInput = target.getAttribute('data-barcode-input') === 'true';

      if (isInputField && !isBarcodeInput) {
        return;
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Handle Enter key (barcode scanner sends Enter after barcode)
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        e.preventDefault();
        onScan(barcodeBuffer.current);
        barcodeBuffer.current = '';
        return;
      }

      // Add character to buffer (ignore special keys)
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }

      // Set timeout to clear buffer (barcode scanners type very fast)
      timeoutRef.current = setTimeout(() => {
        // If buffer has content and timeout expires, it's likely a barcode
        if (barcodeBuffer.current.length >= 3) {
          onScan(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
      }, timeout);
    };

    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan, timeout]);
}
