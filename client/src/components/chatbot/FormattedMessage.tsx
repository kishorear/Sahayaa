import React from 'react';

interface FormattedMessageProps {
  content: string;
  isUser: boolean;
}

export default function FormattedMessage({ content, isUser }: FormattedMessageProps) {
  if (isUser) {
    // User messages remain simple
    return (
      <p className={`text-sm ${isUser ? "text-white" : "text-gray-800"}`}>
        {content}
      </p>
    );
  }

  // Format AI messages for better readability
  const formatAIMessage = (text: string) => {
    // Split into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      
      // Check for numbered lists (1. 2. 3. etc.)
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split(/(?=\d+\.\s)/).filter(item => item.trim());
        return (
          <ol key={index} className="list-decimal list-inside space-y-1 mb-3">
            {items.map((item, itemIndex) => {
              const cleanItem = item.replace(/^\d+\.\s/, '').trim();
              return (
                <li key={itemIndex} className="text-sm text-gray-800">
                  {cleanItem}
                </li>
              );
            })}
          </ol>
        );
      }
      
      // Check for bullet points (- or * at start)
      if (/^[-*]\s/.test(trimmed)) {
        const items = trimmed.split(/(?=[-*]\s)/).filter(item => item.trim());
        return (
          <ul key={index} className="list-disc list-inside space-y-1 mb-3">
            {items.map((item, itemIndex) => {
              const cleanItem = item.replace(/^[-*]\s/, '').trim();
              return (
                <li key={itemIndex} className="text-sm text-gray-800">
                  {cleanItem}
                </li>
              );
            })}
          </ul>
        );
      }
      
      // Check for step-by-step instructions
      if (trimmed.toLowerCase().includes('step') && /step\s*\d+/i.test(trimmed)) {
        const steps = trimmed.split(/(?=step\s*\d+)/i).filter(step => step.trim());
        if (steps.length > 1) {
          return (
            <div key={index} className="space-y-2 mb-3">
              {steps.map((step, stepIndex) => (
                <div key={stepIndex} className="text-sm text-gray-800">
                  <span className="font-medium text-blue-600">
                    {step.match(/step\s*\d+/i)?.[0] || ''}
                  </span>
                  {step.replace(/step\s*\d+:?\s*/i, '')}
                </div>
              ))}
            </div>
          );
        }
      }
      
      // Check for sentences that could be bullet points (multiple sentences with similar structure)
      const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim());
      if (sentences.length > 2) {
        // Look for patterns that suggest these should be bullet points
        const hasActionWords = sentences.some(s => 
          /^(check|verify|ensure|make sure|confirm|review|update|click|go to|navigate|open)/i.test(s.trim())
        );
        
        if (hasActionWords && sentences.length <= 6) {
          return (
            <ul key={index} className="list-disc list-inside space-y-1 mb-3">
              {sentences.map((sentence, sentenceIndex) => {
                const cleanSentence = sentence.trim();
                if (cleanSentence) {
                  return (
                    <li key={sentenceIndex} className="text-sm text-gray-800">
                      {cleanSentence}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          );
        }
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-sm text-gray-800 mb-3 last:mb-0">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="formatted-message">
      {formatAIMessage(content)}
    </div>
  );
}