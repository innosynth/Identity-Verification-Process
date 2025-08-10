import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, UploadCloud } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDndContext, useDraggable } from '@dnd-kit/core';
import { DraggableSignature, SignatureData } from '../components/pdf/DraggableSignature';
import { Button } from '../components/ui/button';
import { CSS } from '@dnd-kit/utilities';

import React from 'react';
import { useParams, useLocation } from 'react-router-dom';

interface SignPdfProps {
  id?: string;
  token?: string;
  onComplete?: () => void;
}

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper to get API key
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY;

// Component for placed signatures that can be dragged within PDF
const PlacedSignature = ({ signature, index, pageDimensions, pdfPageRef, onRemove }: any) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `placed-signature-${index}`,
    data: { signatureIndex: index, signatureData: signature.signature },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Calculate render position based on page dimensions
  const renderX = (signature.position.x / pageDimensions.width) * (pdfPageRef.current?.clientWidth || 1);
  const renderY = (signature.position.y / pageDimensions.height) * (pdfPageRef.current?.clientHeight || 1);

  return (
    <div
      ref={setNodeRef}
      style={{ 
        position: 'absolute', 
        left: renderX, 
        top: renderY, 
        zIndex: 10,
        ...style 
      }}
      className="bg-white/90 border border-blue-200 rounded shadow p-2 flex flex-col items-center cursor-move"
      {...listeners}
      {...attributes}
    >
      <img src={signature.signature.signature} alt="Signature" className="w-32 h-16 object-contain" />
      <div className="text-xs text-gray-500 mt-1">
        <div><strong>Signed by:</strong> {signature.signature.name}</div>
        <div><strong>IP:</strong> {signature.signature.ipAddress}</div>
        <div><strong>Date:</strong> {new Date(signature.signature.timestamp).toLocaleString()}</div>
      </div>
      <Button size="icon" variant="ghost" className="mt-1" onClick={() => onRemove(index)}>
        ×
      </Button>
    </div>
  );
};

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

const SignPdf: React.FC<SignPdfProps> = ({ id: propId, token: propToken, onComplete }) => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = propId || params.id || '';
  const token = propToken || queryParams.get('token') || '';
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);


  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [signaturesOnPages, setSignaturesOnPages] = useState<Array<{
    page: number;
    position: { x: number; y: number };
    signature: SignatureData;
  }>>([]);
  // Add state for the signature data for each type
  const [userSignature, setUserSignature] = useState<SignatureData | null>(null);

  // Store signature data by id for drag-and-drop
  const pdfDropRef = useRef<HTMLDivElement>(null);
  // Add a ref for the actual PDF page area
  const pdfPageRef = useRef<HTMLDivElement>(null);
  // Add a ref for the actual PDF canvas
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Add state for error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Add state for submission completion and signed PDF URL
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  // Add state for consent
  const [consentGiven, setConsentGiven] = useState(false);
  // Load session data based on ID and token
  useEffect(() => {
    if (id && token) {
      setIsLoading(true);
      console.log('Loading signing session:', { id, hasToken: !!token, apiUrl: API_URL });
      
      fetch(`${API_URL}/api/signing-session/${id}`, {
        headers: {
          'x-api-key': API_KEY
        }
      })
        .then(response => {
          console.log('Session response status:', response.status);
          if (!response.ok) {
            return response.text().then(text => {
              console.error('Session response error:', text);
              throw new Error(`HTTP error! status: ${response.status} - ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log('Session data loaded:', data);
          const session = data.session;
          
          // If envelope is already completed, show completion page
          if (session.status === 'completed') {
            setSubmissionComplete(true);
            // Try to get signed PDF URL from session or construct it
            if (session.signed_pdf_url) {
              setSignedPdfUrl(session.signed_pdf_url);
            }
            setIsLoading(false);
            return;
          }
          
          if (session && session.documents && session.documents.length > 0) {
            const document = session.documents[0];
            console.log('Document found:', { id: document.id, filename: document.filename });
            
            // Use document download endpoint for decrypted PDF
            const downloadUrl = `${API_URL}/api/document/${document.id}/download`;
            console.log('Downloading document from:', downloadUrl);
            
            return fetch(downloadUrl, {
              headers: {
                'x-api-key': API_KEY
              }
            })
              .then(res => {
                console.log('Document download response status:', res.status);
                if (!res.ok) {
                  return res.text().then(text => {
                    console.error('Document download error:', text);
                    throw new Error(`Failed to fetch document: ${res.status} - ${text}`);
                  });
                }
                return res.blob();
              })
              .then(blob => {
                console.log('Document blob received, size:', blob.size);
                const file = new File([blob], document.filename, { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                setPdfFile(file);
                setPdfPreviewUrl(blobUrl);

                setIsLoading(false);
                console.log('PDF loaded successfully');
              });
          } else {
            console.error('No documents found in session');
            setPdfError('No documents found in this signing session.');
            setIsLoading(false);
          }
        })
        .catch(error => {
          console.error('Error loading signing session:', error);
          setPdfError(`Failed to load signing session: ${error.message}`);
          setIsLoading(false);
        });
    }
  }, [id, token]);

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
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorMessage('Please upload a valid PDF file.');
        return;
      }
      setPdfFile(file);
      setPdfError(null);
      setPageNumber(1);
      setNumPages(null);
      setIsLoading(true);
      setErrorMessage(null);

      console.log('Uploading file:', file.name, 'Size:', file.size);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('Upload response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('File uploaded successfully:', data.url);

          setPdfPreviewUrl(data.url); // Use backend URL for persistent viewing
        } else {
          const errorText = await response.text();
          console.error('Upload error:', errorText);
          setErrorMessage(`Failed to upload file: ${response.status}`);
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        setErrorMessage(`Failed to upload file: ${error.message}`);
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





  // Remove signature from a page
  const handleRemoveSignature = (index: number) => {
    setSignaturesOnPages(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to get drop coordinates relative to PDF
  function handleDragEnd(event: any) {
    const { over, active, activatorEvent } = event;
    const signatureData = active.data?.current?.signatureData;
    const signatureIndex = active.data?.current?.signatureIndex;
    
    if (over && over.id === 'pdf-drop-area' && pdfPageRef.current) {
      const pageRect = pdfPageRef.current.getBoundingClientRect();
      const clientX = activatorEvent?.clientX;
      const clientY = activatorEvent?.clientY;
      
      if (clientX !== undefined && clientY !== undefined) {
        // Calculate position relative to the PDF page (not the drop area)
        let x = clientX - pageRect.left;
        let y = clientY - pageRect.top;
        
        // Scale coordinates to PDF dimensions if available
        if (pageDimensions.width > 0 && pageDimensions.height > 0) {
          const renderedWidth = pageRect.width;
          const renderedHeight = pageRect.height;
          
          x = (x / renderedWidth) * pageDimensions.width;
          y = (y / renderedHeight) * pageDimensions.height;
        }
        
        // Clamp to reasonable bounds
        const signatureWidth = 128;
        const signatureHeight = 80; // Increased to accommodate metadata
        
        const maxWidth = pageDimensions.width > 0 ? pageDimensions.width : pageRect.width;
        const maxHeight = pageDimensions.height > 0 ? pageDimensions.height : pageRect.height;
        
        x = Math.max(10, Math.min(x, maxWidth - signatureWidth - 10));
        y = Math.max(10, Math.min(y, maxHeight - signatureHeight - 10));
        
        if (signatureIndex !== undefined) {
          // Moving existing signature
          setSignaturesOnPages(prev => prev.map((sig, idx) => 
            idx === signatureIndex 
              ? { ...sig, position: { x, y }, page: pageNumber }
              : sig
          ));
        } else if (signatureData) {
          // Adding new signature
          setSignaturesOnPages(prev => [
            ...prev,
            { page: pageNumber, position: { x, y }, signature: signatureData },
          ]);
        }
      }
    }
  }

  // Remove handleDragOver and isOverPdf logic (handled by useDroppable)

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigning] = useState(false);

  const handleSignLater = async () => {
    try {
      await fetch(`${API_URL}/api/envelope/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({ status: 'signing_deferred', reason: 'sign_later' })
      });
      alert('Document saved. You can return to sign it later.');
      onComplete?.();
    } catch (error) {
      setErrorMessage('Failed to save document for later signing.');
    }
  };

  const handleDeclineSign = async () => {
    try {
      await fetch(`${API_URL}/api/envelope/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({ status: 'signing_declined', reason: 'declined' })
      });
      alert('Document signing declined.');
      onComplete?.();
    } catch (error) {
      setErrorMessage('Failed to decline document.');
    }
  };

  const handleSubmitSignedPdf = async () => {
    if (!userSignature) {
      setErrorMessage('Please provide your signature before submitting.');
      return;
    }
    if (signaturesOnPages.length === 0) {
      setErrorMessage('Please place your signature on the document by clicking "Sign Here" or dragging it.');
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
    
    console.log('Submitting signed PDF with', signatures.length, 'signatures');
    
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('signatures', JSON.stringify(signatures));
    if (id) formData.append('envelopeId', id);
    try {
      // Generate the signed PDF first
      const response = await fetch(`${API_URL}/api/sign-pdf`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY
        },
        body: formData,
      });
      
      console.log('Submit sign PDF response status:', response.status);
      
      if (response.ok) {
        const signedBlob = await response.blob();
        console.log('Signed PDF generated, size:', signedBlob.size);
        
        // Prepare to upload to blob storage
        const uploadForm = new FormData();
        // Use original filename with _signed appended
        const origName = pdfFile.name.replace(/\.pdf$/i, '') + '_signed.pdf';
        const signedFile = new File([signedBlob], origName, { type: 'application/pdf' });
        uploadForm.append('file', signedFile);
        
        console.log('Uploading signed PDF to storage');
        // Upload to blob storage
        const uploadResp = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: uploadForm,
        });
        
        console.log('Upload response status:', uploadResp.status);
        
        if (uploadResp.ok) {
          const data = await uploadResp.json();
          console.log('Signed PDF uploaded successfully:', data.url);
          
          // Update envelope status to completed
          if (id) {
            try {
              await fetch(`${API_URL}/api/envelope/${id}/status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': API_KEY
                },
                body: JSON.stringify({ 
                  status: 'completed',
                  signedPdfUrl: data.url
                })
              });
            } catch (error) {
              console.error('Failed to update envelope status:', error);
            }
          }
          
          setSignedPdfUrl(data.url);
          setSubmissionComplete(true);
          onComplete?.();
        } else {
          const uploadError = await uploadResp.text();
          console.error('Upload error:', uploadError);
          setErrorMessage(`Failed to upload signed PDF: ${uploadResp.status}`);
        }
      } else {
        const signError = await response.text();
        console.error('Sign PDF error:', signError);
        setErrorMessage(`Failed to generate signed PDF: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Submit signed PDF error:', error);
      setErrorMessage(`Failed to submit signed PDF: ${error.message}`);
    }
    setIsSubmitting(false);
  };

  // Modern UI starts here
  const [isMobile, setIsMobile] = useState(false);
  const [tapToPlaceMode, setTapToPlaceMode] = useState<null | 'user' | 'preparer'>(null);
  const [pendingSignatureData, setPendingSignatureData] = useState<SignatureData | null>(null);
  const [pdfContainerWidth, setPdfContainerWidth] = useState<number | undefined>(undefined);
  const pdfResponsiveContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive PDF width
  useEffect(() => {
    if (pdfResponsiveContainerRef.current) {
      setPdfContainerWidth(pdfResponsiveContainerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (pdfResponsiveContainerRef.current) {
        setPdfContainerWidth(pdfResponsiveContainerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfPreviewUrl]);



  // PDF click handler for tap-to-place
  function handlePdfClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (!isMobile || !tapToPlaceMode || !pendingSignatureData) return;
    // Get click coordinates relative to PDF
    const pdfRect = pdfPageRef.current?.getBoundingClientRect();
    if (!pdfRect) return;
    let x = event.clientX - pdfRect.left;
    let y = event.clientY - pdfRect.top;
    // Scale to PDF dimensions
    if (pageDimensions.width > 0 && pageDimensions.height > 0 && pdfPageRef.current) {
      const renderedWidth = pdfPageRef.current.clientWidth;
      const renderedHeight = pdfPageRef.current.clientHeight;
      x = (x / renderedWidth) * pageDimensions.width;
      y = (y / renderedHeight) * pageDimensions.height;
    }
    // Clamp
    const signatureWidth = 128;
    const signatureHeight = 64;
    const maxWidth = pageDimensions.width > 0 ? pageDimensions.width : pdfRect.width;
    const maxHeight = pageDimensions.height > 0 ? pageDimensions.height : pdfRect.height;
    x = Math.max(0, Math.min(x, maxWidth - signatureWidth));
    y = Math.max(0, Math.min(y, maxHeight - signatureHeight));
    setSignaturesOnPages(prev => [
      ...prev,
      { page: pageNumber, position: { x, y }, signature: pendingSignatureData },
    ]);
    setTapToPlaceMode(null);
    setPendingSignatureData(null);
  }



  return (
    <>


      {/* Simplified signature section */}
      {pdfPreviewUrl && !isLoading && (
        <div className="w-full max-w-4xl mx-auto mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <input
              type="checkbox"
              id="consent-checkbox"
              checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              className="accent-blue-600 w-4 h-4"
            />
            <label htmlFor="consent-checkbox" className="text-sm text-gray-700">
              I agree to sign this document electronically
            </label>
          </div>
          <div className="flex justify-center">
            <DraggableSignature
              id="user-provider"
              label="Create Signature"
              position={{ x: 0, y: 0 }}
              onSign={setUserSignature}
              sidebar={true}
              signatureData={userSignature}
              disabled={!consentGiven}
            />
          </div>
        </div>
      )}
      {/* Global Loading Overlay for long operations */}
      {(isSubmitting || isSigning) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center shadow-lg">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
            <p className="text-blue-700 font-medium">{isSubmitting ? 'Submitting your signed PDF...' : 'Generating signed PDF...'}</p>
            <p className="text-gray-500 text-sm mt-1">This may take a moment.</p>
          </div>
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        {submissionComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl bg-white/90 rounded-2xl shadow-2xl p-8 border border-blue-100 animate-fade-in mt-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-4 text-center">Document Already Signed!</h1>
            <p className="text-gray-600 mb-6 text-center max-w-md">You have already signed this document. You can download the signed PDF below.</p>
            {signedPdfUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center w-full max-w-md">
                <p className="text-blue-700 font-medium mb-4">Your Signed Document</p>
                <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  View & Download Signed PDF
                </a>
              </div>
            )}
            {signaturesOnPages.length > 0 && (
              <div className="w-full max-w-md mb-6">
                <h2 className="text-lg font-semibold mb-2 text-blue-900">Signature Audit Log</h2>
                <table className="w-full text-sm border border-blue-200 rounded-lg bg-white">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="p-2 border-b">Page</th>
                      <th className="p-2 border-b">Name</th>
                      <th className="p-2 border-b">IP</th>
                      <th className="p-2 border-b">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signaturesOnPages.map((sig, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{sig.page}</td>
                        <td className="p-2">{sig.signature.name}</td>
                        <td className="p-2">{sig.signature.ipAddress}</td>
                        <td className="p-2">{new Date(sig.signature.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
                  onClick={() => {
                    const csv = [
                      ['Page', 'Name', 'IP', 'Timestamp'],
                      ...signaturesOnPages.map(sig => [
                        sig.page,
                        sig.signature.name,
                        sig.signature.ipAddress,
                        new Date(sig.signature.timestamp).toLocaleString()
                      ])
                    ].map(row => row.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'signature_audit_log.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Audit Log (CSV)
                </button>
              </div>
            )}
            <div className="flex justify-center">
              <Button onClick={() => window.close()} variant="outline" className="px-6 py-2">
                Close Tab
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center w-full">
            <div className="w-full max-w-3xl bg-white/90 rounded-2xl shadow-2xl p-0 md:p-8 flex flex-col items-center border border-blue-100 relative animate-fade-in mt-8">
              <h1 className="text-4xl font-extrabold mb-2 text-center text-blue-900 tracking-tight mt-6">Sign PDF Document</h1>
              <p className="text-gray-500 mb-8 text-center max-w-lg">Upload your PDF, add e-signatures, and send it securely. Drag the signature to the desired position on the document.</p>
              {errorMessage && (
                <div className="w-full max-w-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-center animate-fade-in">
                  <p>{errorMessage}</p>
                  <button onClick={() => setErrorMessage(null)} className="mt-2 text-sm underline">Dismiss</button>
                </div>
              )}
              {/* Upload area - only show if no PDF is loaded and no valid session */}
              {(!id || !token) && !pdfPreviewUrl && (
                <div
                  className={`w-full max-w-lg mb-8 transition-all duration-300 ${pdfPreviewUrl ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                >
                  <div
                    className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer py-10 px-6 transition-colors duration-200 relative"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    tabIndex={0}
                    onKeyDown={() => document.getElementById('pdf-upload')?.click()}
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
              )}
              {/* PDF Preview and Signature Area */}
              <div className="w-full flex flex-col items-center relative px-0 sm:px-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
                    <span className="text-blue-700 font-medium">Loading PDF...</span>
                  </div>
                )}
                {pdfPreviewUrl && !isLoading && (
                  <div className="w-full flex flex-col items-center relative animate-fade-in">
                    {/* PDF Preview Card with droppable or tap-to-place */}
                    <div className="w-full max-w-full overflow-x-auto" ref={pdfResponsiveContainerRef}>
                      <PdfDropArea pdfDropRef={pdfDropRef} isOverPdf={false}>
                        <div
                          ref={pdfPageRef}
                          style={{ position: 'relative', width: '100%', height: '100%', maxWidth: isMobile ? '100vw' : undefined }}
                          className="mx-auto max-w-full sm:max-w-2xl"
                          onClick={isMobile && tapToPlaceMode ? handlePdfClick : undefined}
                        >
                          <Document
                            file={pdfPreviewUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => {
                              const errorMsg = error.message || 'Failed to load PDF file.';
                              console.error('PDF load error:', error);
                              setPdfError(errorMsg);
                              setIsLoading(false);
                            }}
                            loading={<Loader2 className="mr-2 h-8 w-8 animate-spin" />}
                            error={pdfError || 'Failed to load PDF file.'}
                          >
                            <Page
                              pageNumber={pageNumber}
                              width={pdfContainerWidth || undefined}
                              scale={1}
                              onRenderSuccess={(page) => setPageDimensions({ width: page.width, height: page.height })}
                            >
                              {/* Add clickable 'Sign here' placeholder */}
                              {pageNumber === 1 && signaturesOnPages.length === 0 && userSignature && (
                                <div
                                  style={{ position: 'absolute', left: '50%', bottom: '15%', transform: 'translateX(-50%)', zIndex: 5 }}
                                  className="bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg p-3 text-center w-48 opacity-80 cursor-pointer hover:bg-blue-200"
                                  onClick={() => {
                                    const rect = pdfPageRef.current?.getBoundingClientRect();
                                    if (rect) {
                                      const x = (rect.width * 0.5) - 64; // Center horizontally
                                      const y = (rect.height * 0.85) - 32; // Near bottom
                                      
                                      // Scale to PDF dimensions
                                      const scaledX = (x / rect.width) * pageDimensions.width;
                                      const scaledY = (y / rect.height) * pageDimensions.height;
                                      
                                      setSignaturesOnPages(prev => [
                                        ...prev,
                                        { page: pageNumber, position: { x: scaledX, y: scaledY }, signature: userSignature },
                                      ]);
                                    }
                                  }}
                                >
                                  <p className="text-blue-700 font-semibold text-sm">Click to Sign Here</p>
                                  <p className="text-blue-500 text-xs">Or drag your signature</p>
                                </div>
                              )}
                            </Page>
                            {/* Render placed signatures for this page */}
                            {signaturesOnPages.filter(sig => sig.page === pageNumber).map((sig) => {
                              const globalIdx = signaturesOnPages.findIndex(s => s === sig);
                              return (
                                <PlacedSignature
                                  key={globalIdx}
                                  signature={sig}
                                  index={globalIdx}
                                  pageDimensions={pageDimensions}
                                  pdfPageRef={pdfPageRef}
                                  onRemove={handleRemoveSignature}
                                />
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
                    </div>
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
                    {/* Simplified Actions */}
                    <div className="mt-8 flex justify-center gap-4">
                      <Button
                        onClick={handleSubmitSignedPdf}
                        disabled={isSubmitting || !userSignature || signaturesOnPages.length === 0}
                        className="px-8 py-2"
                      >
                        {isSubmitting ? 'Submitting...' : 'Sign & Submit'}
                      </Button>
                      <Button
                        onClick={handleSignLater}
                        variant="outline"
                        className="px-8 py-2"
                      >
                        Sign Later
                      </Button>
                      <Button
                        onClick={handleDeclineSign}
                        variant="destructive"
                        className="px-8 py-2"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DndContext>
    </>
  );
};

export default SignPdf; 