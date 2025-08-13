import React, { useState } from 'react';
import { Button } from '../ui/button';

interface SignaturePlaceholder {
  id: number;
  page_number: number;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  is_signed: boolean;
}

interface SignaturePlaceholderTestProps {
  placeholders: SignaturePlaceholder[];
  onValidationTest: (result: { isValid: boolean; message: string }) => void;
}

export const SignaturePlaceholderTest: React.FC<SignaturePlaceholderTestProps> = ({
  placeholders,
  onValidationTest
}) => {
  const [signedPlaceholders, setSignedPlaceholders] = useState<number[]>([]);

  const validateAllSigned = () => {
    const unsignedPlaceholders = placeholders.filter(p => !signedPlaceholders.includes(p.id));
    
    if (unsignedPlaceholders.length === 0) {
      onValidationTest({
        isValid: true,
        message: 'All signature placeholders have been signed!'
      });
    } else {
      const placeholdersByPage = unsignedPlaceholders.reduce((acc, p) => {
        if (!acc[p.page_number]) acc[p.page_number] = [];
        acc[p.page_number].push(p);
        return acc;
      }, {} as Record<number, SignaturePlaceholder[]>);
      
      const pageList = Object.keys(placeholdersByPage).map(page => 
        `Page ${page} (${placeholdersByPage[parseInt(page)].length} signature${placeholdersByPage[parseInt(page)].length > 1 ? 's' : ''})`
      ).join(', ');
      
      onValidationTest({
        isValid: false,
        message: `Please sign all required locations before submitting. Missing signatures on: ${pageList}`
      });
    }
  };

  const togglePlaceholderSigned = (placeholderId: number) => {
    setSignedPlaceholders(prev => 
      prev.includes(placeholderId) 
        ? prev.filter(id => id !== placeholderId)
        : [...prev, placeholderId]
    );
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Signature Placeholder Validation Test</h3>
      
      <div className="space-y-2 mb-4">
        {placeholders.map(placeholder => (
          <div key={placeholder.id} className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-sm">
              Page {placeholder.page_number} - Position ({placeholder.x_position.toFixed(0)}, {placeholder.y_position.toFixed(0)})
            </span>
            <Button
              size="sm"
              variant={signedPlaceholders.includes(placeholder.id) ? "default" : "outline"}
              onClick={() => togglePlaceholderSigned(placeholder.id)}
            >
              {signedPlaceholders.includes(placeholder.id) ? '✓ Signed' : 'Sign'}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button onClick={validateAllSigned} variant="outline">
          Test Validation
        </Button>
        <Button 
          onClick={() => setSignedPlaceholders(placeholders.map(p => p.id))} 
          variant="secondary"
          size="sm"
        >
          Sign All
        </Button>
        <Button 
          onClick={() => setSignedPlaceholders([])} 
          variant="secondary"
          size="sm"
        >
          Clear All
        </Button>
      </div>
      
      <div className="mt-2 text-sm text-gray-600">
        Signed: {signedPlaceholders.length} of {placeholders.length} required signatures
      </div>
    </div>
  );
};