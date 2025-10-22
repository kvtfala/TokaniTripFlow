import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';

/**
 * Hook to detect current device type based on viewport width
 * Follows Tailwind breakpoints for consistency
 * 
 * Breakpoints:
 * - mobile: < 640px
 * - tablet: 640px - 1024px
 * - laptop: 1024px - 1440px
 * - desktop: >= 1440px
 * 
 * @returns Current device type
 */
export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setDevice('mobile');
      } else if (width < 1024) {
        setDevice('tablet');
      } else if (width < 1440) {
        setDevice('laptop');
      } else {
        setDevice('desktop');
      }
    };

    // Set initial device type
    updateDevice();

    // Update on window resize
    window.addEventListener('resize', updateDevice);

    // Cleanup
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  return device;
}
