import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { DraggableSignature, SignatureData } from '../components/pdf/DraggableSignature';
import { Button } from '../components/ui/button';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { PdfWithMetadataSignatures } from '../components/pdf/PdfWithSignatures';
import { Input } from '../components/ui/input';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const TaxPreparerSign = () => {
  const location = useLocation();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [preparerEmail, setPreparerEmail] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [signaturePositions, setSignaturePositions] = useState({
    user: { x: -9999, y: -9999 },
    preparer: { x: -9999, y: -9999 },
  });
  const [signatures, setSignatures] = useState<{ [key: string]: SignatureData | null }>({
    user: null,
    preparer: null,
  });
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pdfUrl = params.get('pdfUrl');
    const userSignature = params.get('userSignature');
    if (pdfUrl && userSignature) {
      setIsLoading(true);
      fetch(pdfUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "signed_document.pdf", { type: "application/pdf" });
          setPdfFile(file);
          const previewUrl = URL.createObjectURL(file);
          setPdfPreviewUrl(previewUrl);
          setSignatures(prev => ({ ...prev, user: JSON.parse(userSignature) }));
          setIsLoading(false);
        });
    }
  }, [location.search]);

  useEffect(() => {
    if (pageDimensions.height > 0 && pageDimensions.width > 0) {
      setSignaturePositions({
        user: { x: 50, y: pageDimensions.height - 150 },
        preparer: { x: pageDimensions.width - 250, y: pageDimensions.height - 150 },
      });
    }
  }, [pageDimensions]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  const goToNextPage = () => setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages!));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setSignaturePositions(prev => ({
      ...prev,
      [active.id]: {
        x: prev[active.id as keyof typeof prev].x + delta.x,
        y: prev[active.id as keyof typeof prev].y + delta.y,
      },
    }));
  };

  const handleSign = (id: string, signature: SignatureData) => {
    setSignatures(prev => ({ ...prev, [id]: signature }));
  };

  const handleSubmit = async () => {
    if (!pdfFile || !numPages || !signatures.user || !signatures.preparer) {
        alert("Both signatures are required to submit.");
        return;
    }
    setIsSigning(true);
    
    // Organize signatures by page for the PDF generator
    const signaturesByPage: {
      [page: number]: Array<{
        position: { x: number; y: number };
        signature: {
          signature: string;
          name: string;
          ipAddress: string;
          timestamp: string;
        };
      }>;
    } = {
      1: [] // Assuming signatures are on page 1, adjust as needed
    };
    
    // Add user signature
    if (signatures.user) {
      signaturesByPage[1].push({
        position: signaturePositions.user,
        signature: signatures.user
      });
    }
    
    // Add preparer signature
    if (signatures.preparer) {
      signaturesByPage[1].push({
        position: signaturePositions.preparer,
        signature: signatures.preparer
      });
    }
    
    const blob = await pdf((
      <PdfWithMetadataSignatures
        pdfFile={pdfFile}
        signaturesByPage={signaturesByPage}
        numPages={numPages}
      />
    )).toBlob();
    
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('userEmail', userEmail);
    formData.append('preparerEmail', preparerEmail);

    try {
        const response = await fetch('http://localhost:3001/api/finalize', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        window.open(data.url, '_blank');
        alert("Document submitted successfully!");
    } catch (error) {
        console.error('Error finalizing document:', error);
    }

    setIsSigning(false);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="container mx-auto p-4 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-center">Tax Preparer Sign</h1>
        <div className="w-full max-w-md mb-6 flex gap-4">
            <Input 
                placeholder="Your Email" 
                value={userEmail} 
                onChange={(e) => setUserEmail(e.target.value)} 
            />
            <Input
                placeholder="Tax Preparer's Email"
                value={preparerEmail}
                onChange={(e) => setPreparerEmail(e.target.value)}
            />
        </div>
        {isLoading && <Loader2 className="mr-2 h-8 w-8 animate-spin" />}
        {pdfPreviewUrl && !isLoading && (
          <div className="w-full flex flex-col items-center relative">
            {signatures.user && (
              <div className="absolute bg-green-200 border-2 border-dashed border-green-500 p-4 rounded-lg shadow-lg z-10" style={{ left: signaturePositions.user.x, top: signaturePositions.user.y }}>
                <img src={signatures.user.signature} alt="User Signature" />
              </div>
            )}
            <DraggableSignature 
              id="preparer" 
              label="Tax Preparer E-sign" 
              position={signaturePositions.preparer} 
              onSign={(sig) => handleSign('preparer', sig)}
            />
            <div className="border rounded-lg shadow-lg overflow-hidden">
              <Document
                file={pdfPreviewUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  setPdfError(error.message || 'Failed to load PDF file.');
                  console.error(error);
                }}
                loading={<Loader2 className="mr-2 h-8 w-8 animate-spin" />}
                error={pdfError || 'Failed to load PDF file.'}
              >
                <Page 
                  pageNumber={pageNumber} 
                  onRenderSuccess={(page) => setPageDimensions({ width: page.width, height: page.height })}
                />
              </Document>
            </div>
            {numPages && (
              <div className="flex items-center justify-center mt-4">
                <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">
                  Prev
                </button>
                <p className="mx-4">
                  Page {pageNumber} of {numPages}
                </p>
                <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">
                  Next
                </button>
              </div>
            )}
            <div className="mt-6">
                <Button onClick={handleSubmit} disabled={isSigning}>
                    {isSigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit
                </Button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default TaxPreparerSign; 