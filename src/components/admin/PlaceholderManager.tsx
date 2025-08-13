import { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';

interface Placeholder {
  id?: number;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlaceholderManagerProps {
  pdfFile: File;
  onPlaceholdersChange: (placeholders: Placeholder[]) => void;
  initialPlaceholders?: Placeholder[];
}

export const PlaceholderManager = ({ pdfFile, onPlaceholdersChange, initialPlaceholders = [] }: PlaceholderManagerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>(initialPlaceholders);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [isAddMode, setIsAddMode] = useState(false);
  const [draggedPlaceholder, setDraggedPlaceholder] = useState<number | null>(null);
  const pdfPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPlaceholdersChange(placeholders);
  }, [placeholders, onPlaceholdersChange]);

  const handlePdfClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAddMode) return;
    
    try {
      if (!pdfPageRef.current || pageDimensions.width === 0 || pageDimensions.height === 0) return;
      
      const canvas = pdfPageRef.current.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = pageDimensions.width / rect.width;
      const scaleY = pageDimensions.height / rect.height;
      
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      
      const newPlaceholder: Placeholder = {
        page: currentPage,
        x: Math.max(0, (x - 64) / pageDimensions.width),
        y: Math.max(0, (y - 32) / pageDimensions.height),
        width: 128 / pageDimensions.width,
        height: 64 / pageDimensions.height
      };
      
      setPlaceholders(prev => [...prev, newPlaceholder]);
      setIsAddMode(false);
    } catch (error) {
      console.error('Error adding placeholder:', error);
    }
  };

  const handlePlaceholderMouseDown = (e: React.MouseEvent, placeholderIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedPlaceholder(placeholderIndex);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!pdfPageRef.current || pageDimensions.width === 0) return;
      
      const canvas = pdfPageRef.current.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = pageDimensions.width / rect.width;
      const scaleY = pageDimensions.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      setPlaceholders(prev => prev.map((p, i) => 
        i === placeholderIndex 
          ? { ...p, x: Math.max(0, (x - 64) / pageDimensions.width), y: Math.max(0, (y - 32) / pageDimensions.height) }
          : p
      ));
    };
    
    const handleMouseUp = () => {
      setDraggedPlaceholder(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const removePlaceholder = (placeholderIndex: number) => {
    setPlaceholders(prev => prev.filter((_, i) => i !== placeholderIndex));
  };

  const currentPagePlaceholders = placeholders.filter(p => p.page === currentPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 font-medium">
          Define signature locations. Users will only be able to sign at these locations.
        </div>
        <Button
          type="button"
          variant={isAddMode ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setIsAddMode(!isAddMode);
          }}
          className={isAddMode ? "bg-blue-600 text-white" : ""}
        >
          {isAddMode ? "Cancel" : "Add Placeholder"}
        </Button>
      </div>
      {isAddMode && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          Click on the PDF to place a signature placeholder
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '500px' }}>
        <div className="h-full overflow-auto">
          <div 
            ref={pdfPageRef} 
            className={`relative h-full flex items-center justify-center ${isAddMode ? 'cursor-crosshair' : 'cursor-default'}`} 
            onClick={handlePdfClick}
          >
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="flex items-center justify-center h-full"
            >
              <Page
                pageNumber={currentPage}
                height={450}
                onRenderSuccess={(page) => setPageDimensions({ width: page.width, height: page.height })}
              />
              
              {/* Render placeholders for current page */}
              {currentPagePlaceholders.map((placeholder, index) => {
                const globalIndex = placeholders.findIndex(p => p === placeholder);
                const canvas = pdfPageRef.current?.querySelector('canvas');
                if (!canvas) return null;
                
                const rect = canvas.getBoundingClientRect();
                const containerRect = pdfPageRef.current!.getBoundingClientRect();
                const scaleX = rect.width / pageDimensions.width;
                const scaleY = rect.height / pageDimensions.height;
                
                return (
                  <div
                    key={`${currentPage}-${index}`}
                    className={`absolute bg-blue-200 border-2 border-blue-500 border-dashed rounded flex items-center justify-center group hover:bg-blue-300 transition-colors ${
                      draggedPlaceholder === globalIndex ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      left: (rect.left - containerRect.left) + (placeholder.x * pageDimensions.width * scaleX),
                      top: (rect.top - containerRect.top) + (placeholder.y * pageDimensions.height * scaleY),
                      width: placeholder.width * pageDimensions.width * scaleX,
                      height: placeholder.height * pageDimensions.height * scaleY,
                      zIndex: draggedPlaceholder === globalIndex ? 10 : 5
                    }}
                    onMouseDown={(e) => handlePlaceholderMouseDown(e, globalIndex)}
                  >
                    <span className="text-xs text-blue-700 font-medium pointer-events-none">Sign Here</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removePlaceholder(globalIndex);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </Document>
          </div>
        </div>
      </div>

      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(prev => prev - 1);
            }}
            className="hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            Previous
          </Button>
          <span className="text-sm font-medium">Page {currentPage} of {numPages}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= numPages}
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(prev => prev + 1);
            }}
            className="hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            Next
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Total placeholders: <span className="font-medium">{placeholders.length}</span></span>
        <div className="flex gap-2">
          {numPages && numPages > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                const currentPagePlaceholder = placeholders.find(p => p.page === currentPage);
                if (currentPagePlaceholder) {
                  const newPlaceholders = [];
                  for (let page = 1; page <= numPages; page++) {
                    if (!placeholders.some(p => p.page === page)) {
                      newPlaceholders.push({
                        ...currentPagePlaceholder,
                        page
                      });
                    }
                  }
                  setPlaceholders(prev => [...prev, ...newPlaceholders]);
                }
              }}
              className="hover:bg-blue-50 hover:text-blue-600"
            >
              Copy to All Pages
            </Button>
          )}
          {placeholders.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                setPlaceholders([]);
              }}
              className="hover:bg-red-50 hover:text-red-600"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};