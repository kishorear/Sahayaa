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
      
      {/* Exclamation Mark */}
      <rect x="29" y="15" width="6" height="22" rx="3" fill="white" />
      <circle cx="32" cy="45" r="3" fill="white" />
    </svg>
  );
};

export default LogoIcon;