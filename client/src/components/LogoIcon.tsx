import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-8 h-8" }) => {
  // Soft light blue color - slightly pastel as requested
  const softLightBlue = "#92B4E1";
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      className={className}
    >
      {/* Circular background in soft light blue with smooth edges */}
      <circle cx="32" cy="32" r="30" fill={softLightBlue} />
      
      {/* White exclamation mark with rounded corners */}
      <g>
        {/* Dot part of exclamation mark */}
        <circle cx="32" cy="47" r="4" fill="white" />
        
        {/* Vertical part of exclamation mark with rounded caps */}
        <rect x="28" y="17" width="8" height="22" rx="4" fill="white" />
      </g>
    </svg>
  );
};

export default LogoIcon;