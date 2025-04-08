import React from "react";

interface DonutChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  height: number;
  colors: string[];
}

export default function DonutChart({ data, dataKey, nameKey, height, colors = ['#6366F1'] }: DonutChartProps) {
  // This is a simplified placeholder component
  // In a real implementation, this would use a charting library like recharts
  
  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '8px',
        color: '#6b7280',
        fontSize: '14px',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Donut Chart: {dataKey}</p>
          <p>Labels: {nameKey}</p>
          <p>Data points: {data?.length || 0}</p>
          <p style={{ color: colors[0] }}>Primary color: {colors[0]}</p>
        </div>
      </div>
    </div>
  );
}
