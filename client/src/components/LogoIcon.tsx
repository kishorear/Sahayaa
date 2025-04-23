import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      className={className}
    >
      {/* Background Circle */}
      <circle cx="32" cy="32" r="30" fill="#4F46E5" />
      
      {/* Inner Light Ring */}
      <circle cx="32" cy="32" r="24" fill="#6366F1" />
      
      {/* Center Element */}
      <g>
        {/* Abstract "S" shape */}
        <path d="M24 20 Q18 22, 20 28 Q22 34, 28 32 Q22 34, 20 40 Q18 46, 24 48" 
              stroke="white" strokeWidth="3" fill="transparent" strokeLinecap="round" />
        
        {/* Chat Bubbles */}
        <circle cx="38" cy="22" r="5" fill="white" opacity="0.9" />
        <circle cx="44" cy="32" r="4" fill="white" opacity="0.7" />
        <circle cx="38" cy="42" r="3" fill="white" opacity="0.5" />
        
        {/* Connection Lines */}
        <line x1="33" y1="22" x2="36" y2="22" stroke="white" strokeWidth="1.5" />
        <line x1="38" y1="27" x2="40" y2="30" stroke="white" strokeWidth="1.5" />
        <line x1="42" y1="36" x2="40" y2="39" stroke="white" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export default LogoIcon;