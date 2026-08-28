import React from 'react';

interface AiworksLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  className?: string;
  height?: number;
}

export const AiworksLogo: React.FC<AiworksLogoProps> = ({
  className = '',
  height = 28,
}) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/aiworks-logo-transparent.png"
        alt="AIWORKS 에이아이웍스"
        style={{ height: `${height}px`, width: 'auto' }}
        className="shrink-0 object-contain drop-shadow-sm"
      />
    </div>
  );
};
