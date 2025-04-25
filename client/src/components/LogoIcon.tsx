import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-8 h-8" }) => {
  // Exact pastel blue color as specified
  const pastelBlue = "#82AEEB";
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      className={className}
    >
      {/* Circle with pastel blue stroke */}
      <circle 
        cx="32" 
        cy="32" 
        r="30" 
        fill="none" 
        stroke={pastelBlue} 
        strokeWidth="6" 
      />
      
      {/* White exclamation mark - geometric sans-serif style */}
      <g>
        {/* Dot part of exclamation mark */}
        <circle cx="32" cy="45" r="4" fill={pastelBlue} />
        
        {/* Vertical part of exclamation mark - straight sides */}
        <rect x="28" y="15" width="8" height="23" fill={pastelBlue} />
      </g>
    </svg>
  );
};

export default LogoIcon;