import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, UploadCloud, FileCheck2, Signature as SignatureIcon } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDndContext } from '@dnd-kit/core';
import { DraggableSignature, SignatureData } from '../components/pdf/DraggableSignature';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { PdfWithMetadataSignatures } from '../components/pdf/PdfWithSignatures';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const API_URL = import.meta.env.VITE_API_URL || 'https://identity-verification-process.vercel.app';

const PdfDropArea = ({ children, pdfDropRef, isOverPdf }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'pdf-drop-area' });
  return (
    <div
      ref={node => {
        setNodeRef(node);
        if (pdfDropRef) pdfDropRef.current = node;
      }}
      className={`border-2 border-blue-200 rounded-xl shadow-xl overflow-hidden bg-white relative w-full max-w-2xl transition-all duration-300 ${isOverPdf || isOver ? 'ring-4 ring-blue-400' : ''}`}
      style={{ minHeight: 500 }}
    >
      {children}
    </div>
  );
};

const SignPdf = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [taxPreparerEmail, setTaxPreparerEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [signaturesOnPages, setSignaturesOnPages] = useState<Array<{
    page: number;
    position: { x: number; y: number };
    signature: SignatureData;
  }>>([]);
  // Add state for the signature data for each type
  const [userSignature, setUserSignature] = useState<SignatureData | null>(null);
  const [preparerSignature, setPreparerSignature] = useState<SignatureData | null>(null);
  // Store signature data by id for drag-and-drop
  const pdfDropRef = useRef<HTMLDivElement>(null);
  // Add a ref for the actual PDF page area
  const pdfPageRef = useRef<HTMLDivElement>(null);
  // Add a ref for the actual PDF canvas
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Helper to set the canvas ref after Page renders
  useEffect(() => {
    if (pdfPageRef.current) {
      const canvas = pdfPageRef.current.querySelector('canvas');
      if (canvas) {
        pdfCanvasRef.current = canvas as HTMLCanvasElement;
      }
    }
  }, [pageNumber, pdfPreviewUrl, isLoading]);
  const { active } = useDndContext() || {};

  // Update signatureMap when user/preparer signs
  useEffect(() => {
    // Remove setSignatureMap calls (no longer needed)
  }, [userSignature]);
  useEffect(() => {
    // Remove setSignatureMap calls (no longer needed)
  }, [preparerSignature]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
      }
      setPdfFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPdfPreviewUrl(previewUrl);
      setPdfError(null);
      setPageNumber(1);
      setNumPages(null);
      setIsLoading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setPdfUrl(data.url);
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // No longer needed for signature placement
  }, [pageDimensions]);

  const goToPrevPage = () => setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  const goToNextPage = () => setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages!));

  const handleSendToTaxPreparer = async () => {
    if (!pdfUrl) {
      alert("Please upload a document first.");
      return;
    }
    // Prepare signatures data with consistent coordinate system
    const signaturesData = signaturesOnPages.map(sig => ({
      page: sig.page,
      x: sig.position.x,
      y: sig.position.y,
      signature: {
        ...sig.signature,
        imageDataUrl: sig.signature.signature,
      }
    }));
    
    try {
      await fetch(`${API_URL}/api/send-to-preparer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: taxPreparerEmail,
          pdfUrl,
          signatures: signaturesData,
        }),
      });
      setEmailSent(true);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const handleViewSignedPdf = async () => {
    if (!pdfFile || !numPages) return;
    setIsSigning(true);
    // Prepare signatures data for backend
    const signatures = signaturesOnPages.map(sig => ({
      page: sig.page,
      x: sig.position.x,
      y: sig.position.y,
      imageDataUrl: sig.signature.signature, // assuming this is a data URL (base64 PNG)
      width: sig.signature.width || 128, // use signature width if available, otherwise default
      height: sig.signature.height || 64, // use signature height if available, otherwise default
      name: sig.signature.name,
      ipAddress: sig.signature.ipAddress,
      timestamp: sig.signature.timestamp,
    }));
    
    // Debug logging
    console.log('Sending signatures data to backend:', JSON.stringify(signatures, null, 2));
    
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('signatures', JSON.stringify(signatures));
    try {
      const response = await fetch(`${API_URL}/api/sign-pdf`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('Failed to generate signed PDF');
      }
    } catch (error) {
      alert('Failed to generate signed PDF');
    }
    setIsSigning(false);
  };

  // New: Remove signature from a page
  const handleRemoveSignature = (index: number) => {
    setSignaturesOnPages(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to get drop coordinates relative to PDF
  function getRelativeCoords(event: any) {
    const pdfRect = pdfDropRef.current?.getBoundingClientRect();
    if (!pdfRect) return { x: 0, y: 0 };
    const x = event.clientX - pdfRect.left;
    const y = event.clientY - pdfRect.top;
    return { x, y };
  }

  function handleDragEnd(event: any) {
    console.log('handleDragEnd', event);
    const { over, active, activatorEvent } = event;
    const signatureData = active.data?.current?.signatureData;
    if (over) {
      console.log('Dropped over:', over.id);
    }
    
    // Use pdfDropRef for correct coordinates (the droppable area)
    if (over && over.id === 'pdf-drop-area' && signatureData && pdfDropRef.current) {
      const pdfRect = pdfDropRef.current.getBoundingClientRect();
      const clientX = activatorEvent?.clientX;
      const clientY = activatorEvent?.clientY;
      
      if (clientX !== undefined && clientY !== undefined) {
        // Calculate position relative to the PDF drop area
        let x = clientX - pdfRect.left;
        let y = clientY - pdfRect.top;
        
        // Get the actual PDF page container dimensions
        const pageContainer = pdfPageRef.current;
        if (pageContainer) {
          const pageRect = pageContainer.getBoundingClientRect();
          // Adjust for any offset between drop area and actual page container
          x = x - (pageRect.left - pdfRect.left);
          y = y - (pageRect.top - pdfRect.top);
          
          // Also account for scroll position if any
          x = x + pageContainer.scrollLeft;
          y = y + pageContainer.scrollTop;
        }
        
        // If we have actual page dimensions, we need to scale the coordinates
        if (pageDimensions.width > 0 && pageDimensions.height > 0 && pageContainer) {
          // Get the rendered dimensions of the PDF page
          const renderedRect = pageContainer.getBoundingClientRect();
          const renderedWidth = renderedRect.width;
          const renderedHeight = renderedRect.height;
          
          // Scale the coordinates from rendered dimensions to actual PDF dimensions
          // This ensures the signature position is consistent with the actual PDF coordinates
          x = (x / renderedWidth) * pageDimensions.width;
          y = (y / renderedHeight) * pageDimensions.height;
        }
        
        // Clamp to reasonable bounds (accounting for signature size)
        const signatureWidth = 128;
        const signatureHeight = 64;
        
        // Use actual page dimensions for clamping if available
        const maxWidth = pageDimensions.width > 0 ? pageDimensions.width : pdfRect.width;
        const maxHeight = pageDimensions.height > 0 ? pageDimensions.height : pdfRect.height;
        
        x = Math.max(0, Math.min(x, maxWidth - signatureWidth));
        y = Math.max(0, Math.min(y, maxHeight - signatureHeight));
        
        setSignaturesOnPages(prev => [
          ...prev,
          { page: pageNumber, position: { x, y }, signature: signatureData },
        ]);
        console.log('Signature placed at:', x, y, 'in page of size:', maxWidth, 'x', maxHeight);
      }
    }
  }

  // Remove handleDragOver and isOverPdf logic (handled by useDroppable)

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitSignedPdf = async () => {
    if (signaturesOnPages.length < 2) {
      alert('Please ensure both signatures are provided before submitting.');
      return;
    }
    if (!pdfFile || !numPages) return;
    setIsSubmitting(true);
    // Prepare signatures data for backend
    const signatures = signaturesOnPages.map(sig => ({
      page: sig.page,
      x: sig.position.x,
      y: sig.position.y,
      imageDataUrl: sig.signature.signature,
      width: sig.signature.width || 128,
      height: sig.signature.height || 64,
      name: sig.signature.name,
      ipAddress: sig.signature.ipAddress,
      timestamp: sig.signature.timestamp,
    }));
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('signatures', JSON.stringify(signatures));
    try {
      // Generate the signed PDF first
      const response = await fetch(`${API_URL}/api/sign-pdf`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const signedBlob = await response.blob();
        // Prepare to upload to blob storage
        const uploadForm = new FormData();
        // Use original filename with _signed appended
        const origName = pdfFile.name.replace(/\.pdf$/i, '') + '_signed.pdf';
        const signedFile = new File([signedBlob], origName, { type: 'application/pdf' });
        uploadForm.append('file', signedFile);
        // Upload to blob storage
        const uploadResp = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: uploadForm,
        });
        if (uploadResp.ok) {
          const data = await uploadResp.json();
          alert('Signed PDF submitted and saved successfully!\nURL: ' + data.url);
        } else {
          alert('Failed to upload signed PDF.');
        }
      } else {
        alert('Failed to generate signed PDF.');
      }
    } catch (error) {
      alert('Failed to submit signed PDF.');
    }
    setIsSubmitting(false);
  };

  // Modern UI starts here
  return (
    <DndContext
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-2 relative">
        {/* Floating signature provider panels - left and right */}
        {pdfPreviewUrl && !isLoading && (
          <>
            <div className="fixed left-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30 bg-white/90 border border-blue-100 rounded-2xl shadow-2xl p-4 animate-fade-in">
              <DraggableSignature
                id="user-provider"
                label="User E-sign"
                position={{ x: 0, y: 0 }}
                onSign={setUserSignature}
                sidebar={true}
                signatureData={userSignature}
              />
            </div>
            <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30 bg-white/90 border border-blue-100 rounded-2xl shadow-2xl p-4 animate-fade-in">
              <DraggableSignature
                id="preparer-provider"
                label="Tax Preparer E-sign"
                position={{ x: 0, y: 100 }}
                onSign={setPreparerSignature}
                sidebar={true}
                signatureData={preparerSignature}
              />
            </div>
          </>
        )}
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center w-full">
          <div className="w-full max-w-3xl bg-white/90 rounded-2xl shadow-2xl p-0 md:p-8 flex flex-col items-center border border-blue-100 relative animate-fade-in mt-8">
            <h1 className="text-4xl font-extrabold mb-2 text-center text-blue-900 tracking-tight mt-6">Sign PDF Document</h1>
            <p className="text-gray-500 mb-8 text-center max-w-lg">Upload your PDF, add e-signatures, and send it securely. Drag the signature to the desired position on the document.</p>

              {/* Upload area */}
              <div
                className={`w-full max-w-lg mb-8 transition-all duration-300 ${pdfPreviewUrl ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
              >
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer py-10 px-6 transition-colors duration-200 relative"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') document.getElementById('pdf-upload')?.click(); }}
                  aria-label="Upload PDF"
                >
                  <UploadCloud className="w-12 h-12 text-blue-400 mb-2 animate-bounce-slow" />
                  <span className="font-semibold text-blue-700 text-lg">Click or drag to upload PDF</span>
                  <span className="text-xs text-gray-400 mt-1">(Only .pdf files are supported)</span>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* PDF Preview and Signature Area */}
              <div className="w-full flex flex-col items-center relative">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
                    <span className="text-blue-700 font-medium">Loading PDF...</span>
                  </div>
                )}
                {pdfPreviewUrl && !isLoading && (
                  <div className="w-full flex flex-col items-center relative animate-fade-in">
                    {/* PDF Preview Card with droppable */}
                    <PdfDropArea pdfDropRef={pdfDropRef} isOverPdf={false}>
                      <div ref={pdfPageRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
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
                            width={pageDimensions.width > 0 ? pageDimensions.width : undefined}
                            scale={1}
                            onRenderSuccess={(page) => setPageDimensions({ width: page.width, height: page.height })}
                          />
                          {/* Render placed signatures for this page */}
                          {signaturesOnPages.filter(sig => sig.page === pageNumber).map((sig, idx) => {
                            // Calculate render position based on page dimensions
                            const renderX = (sig.position.x / pageDimensions.width) * (pdfPageRef.current?.clientWidth || 1);
                            const renderY = (sig.position.y / pageDimensions.height) * (pdfPageRef.current?.clientHeight || 1);
                            
                            return (
                              <div
                                key={idx}
                                style={{ position: 'absolute', left: renderX, top: renderY, zIndex: 10 }}
                                className="bg-white/90 border border-blue-200 rounded shadow p-2 flex flex-col items-center"
                              >
                                <img src={sig.signature.signature} alt="Signature" className="w-32 h-16 object-contain" />
                                <div className="text-xs text-gray-500 mt-1">
                                  <div><strong>Signed by:</strong> {sig.signature.name}</div>
                                  <div><strong>IP:</strong> {sig.signature.ipAddress}</div>
                                  <div><strong>Date:</strong> {new Date(sig.signature.timestamp).toLocaleString()}</div>
                                </div>
                                <Button size="icon" variant="ghost" className="mt-1" onClick={() => handleRemoveSignature(idx)}>
                                  ×
                                </Button>
                              </div>
                            );
                          })}
                        </Document>
                        {/* DragOverlay for active drag */}
                        <DragOverlay>
                          {active && active.data?.current?.signatureData && (
                            <div className="bg-yellow-100 border border-yellow-400 rounded shadow p-2 flex flex-col items-center">
                              <img src={active.data.current.signatureData.signature} alt="Signature Preview" className="w-32 h-16 object-contain" />
                              <div className="text-xs text-gray-500 mt-1">
                                <div><strong>Signed by:</strong> {active.data.current.signatureData.name}</div>
                              </div>
                            </div>
                          )}
                        </DragOverlay>
                      </div>
                    </PdfDropArea>
                    {/* Page navigation */}
                    {numPages && (
                      <div className="flex items-center justify-center mt-4 gap-2">
                        <Button onClick={goToPrevPage} disabled={pageNumber <= 1} variant="ghost" size="sm">
                          Prev
                        </Button>
                        <span className="mx-2 text-gray-600 text-sm font-medium">
                          Page {pageNumber} of {numPages}
                        </span>
                        <Button onClick={goToNextPage} disabled={pageNumber >= numPages} variant="ghost" size="sm">
                          Next
                        </Button>
                      </div>
                    )}
                    {/* Actions */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4 w-full justify-center">
                      <Button
                        onClick={handleViewSignedPdf}
                        disabled={isSigning}
                        className="w-full md:w-auto shadow-md"
                      >
                        {isSigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <FileCheck2 className="mr-2 h-5 w-5" />
                        View Signed PDF
                      </Button>
                      {!emailSent ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto shadow-md">
                              Send to Tax Preparer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send to Tax Preparer</DialogTitle>
                            </DialogHeader>
                            <div className="p-4 flex flex-col gap-4">
                              <Input
                                placeholder="Tax Preparer's Email"
                                value={taxPreparerEmail}
                                onChange={(e) => setTaxPreparerEmail(e.target.value)}
                                className="mb-2"
                              />
                              <Button onClick={handleSendToTaxPreparer} className="w-full">
                                Send Email
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button onClick={() => alert('Process finalized.')} className="w-full md:w-auto shadow-md" variant="secondary">
                          Finalize
                        </Button>
                      )}
                      <Button
                        onClick={handleSubmitSignedPdf}
                        disabled={isSubmitting}
                        className="w-full md:w-auto shadow-md"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DndContext>
    );
};

export default SignPdf; 