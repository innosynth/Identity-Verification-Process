import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, UploadCloud, FileCheck2 } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDndContext } from '@dnd-kit/core';
import { DraggableSignature, SignatureData } from '../components/pdf/DraggableSignature';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';

interface SignPdfProps {
  id?: string;
  token?: string;
  onBack?: () => void;
  onComplete?: () => void;
}

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get API key
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'api_a44ed8187b7eefb29518361d3e2eda69';


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

const SignPdf: React.FC<SignPdfProps> = ({ id: propId, token: propToken, onBack, onComplete }) => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = propId || params.id || '';
  const token = propToken || queryParams.get('token') || '';
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
  // Add state for error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Add state for submission completion and signed PDF URL
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  // Add state for consent
  const [consentGiven, setConsentGiven] = useState(false);
  // Add state for active signature role
  const [activeRole, setActiveRole] = useState<'user' | 'preparer'>('user');

  // Load session data based on ID and token
  useEffect(() => {
    if (id && token) {
      setIsLoading(true);
      fetch(`${API_URL}/api/signing-session/${id}`, {
        headers: {
          'x-api-key': API_KEY
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('Session data loaded:', data);
          const session = data.session;
          if (session && session.documents && session.documents.length > 0) {
            const docUrl = session.documents[0].url;
            console.log('Fetching document from URL:', docUrl);
            return fetch(docUrl)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch document: ${res.status}`);
                }
                return res.blob();
              })
              .then(blob => {
                const file = new File([blob], session.documents[0].filename, { type: 'application/pdf' });
                setPdfFile(file);
                setPdfPreviewUrl(docUrl); // Use backend URL for persistent viewing
                setPdfUrl(docUrl);
                setIsLoading(false);
              });
          } else {
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
  }, [preparerSignature]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
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

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setPdfUrl(data.url);
        setPdfPreviewUrl(data.url); // Use backend URL for persistent viewing
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
      setErrorMessage("Please upload a document first.");
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
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          to: taxPreparerEmail,
          pdfUrl,
          signatures: signaturesData,
        }),
      });
      setEmailSent(true);
      onComplete?.();
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
        setErrorMessage('Failed to generate signed PDF');
      }
    } catch (error) {
      setErrorMessage('Failed to generate signed PDF');
    }
    setIsSigning(false);
  };

  // New: Remove signature from a page
  const handleRemoveSignature = (index: number) => {
    setSignaturesOnPages(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to get drop coordinates relative to PDF
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
      setErrorMessage('Please ensure both signatures are provided before submitting.');
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
          setSignedPdfUrl(data.url);
          setSubmissionComplete(true);
          onComplete?.();
        } else {
          setErrorMessage('Failed to upload signed PDF.');
        }
      } else {
        setErrorMessage('Failed to generate signed PDF.');
      }
    } catch (error) {
      setErrorMessage('Failed to submit signed PDF.');
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

  // Tap to place handler
  function handleSignatureTapToPlace(type: 'user' | 'preparer', signatureData: SignatureData | null) {
    if (!signatureData) return;
    setTapToPlaceMode(type);
    setPendingSignatureData(signatureData);
  }

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

  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'User Sign' },
    { id: 3, label: 'Preparer Sign' },
    { id: 4, label: 'Submit' },
  ];
  const currentStep = !pdfPreviewUrl ? 1 : !userSignature ? 2 : !preparerSignature ? 3 : 4;

  return (
    <>
      {/* Sticky, horizontally scrollable signature header for mobile */}
      {pdfPreviewUrl && !isLoading && isMobile && (
        <div className="sticky top-0 z-40 w-full bg-white/95 border-b border-yellow-100 shadow-md overflow-x-auto flex flex-row gap-2 py-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-row gap-2 min-w-[400px]">
            <button
              className={`flex-1 px-2 py-1 rounded-lg font-semibold text-xs ${tapToPlaceMode === 'user' ? 'bg-yellow-200 text-yellow-900' : 'bg-yellow-50 text-yellow-700'}`}
              onClick={() => handleSignatureTapToPlace('user', userSignature)}
              disabled={!userSignature}
            >
              User E-sign
            </button>
            <button
              className={`flex-1 px-2 py-1 rounded-lg font-semibold text-xs ${tapToPlaceMode === 'preparer' ? 'bg-yellow-200 text-yellow-900' : 'bg-yellow-50 text-yellow-700'}`}
              onClick={() => handleSignatureTapToPlace('preparer', preparerSignature)}
              disabled={!preparerSignature}
            >
              Tax Preparer E-sign
            </button>
            {/* Show signature previews in header */}
            <div className="flex flex-row gap-2 items-center">
              {userSignature && <img src={userSignature.signature} alt="User Signature" className="w-16 h-8 object-contain border border-yellow-200 rounded bg-white" />}
              {preparerSignature && <img src={preparerSignature.signature} alt="Preparer Signature" className="w-16 h-8 object-contain border border-yellow-200 rounded bg-white" />}
            </div>
          </div>
        </div>
      )}
      {/* Signature input for mobile (below sticky header) */}
      {pdfPreviewUrl && !isLoading && isMobile && (
        <div className="w-full flex flex-col gap-2 mb-2 mt-2">
            {/* Consent checkbox and legal notice */}
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <label htmlFor="consent-checkbox" className="text-xs text-gray-700">
                I agree to sign this document electronically and acknowledge that my electronic signature is legally binding.
              </label>
            </div>
            {/* Show signature input for whichever is missing */}
            {activeRole === 'user' && !userSignature && (
              <DraggableSignature
                id="user-provider"
                label="User E-sign"
                position={{ x: 0, y: 0 }}
                onSign={setUserSignature}
                sidebar={true}
                signatureData={userSignature}
                disabled={!consentGiven}
              />
            )}
            {activeRole === 'preparer' && !preparerSignature && (
              <DraggableSignature
                id="preparer-provider"
                label="Tax Preparer E-sign"
                position={{ x: 0, y: 100 }}
                onSign={setPreparerSignature}
                sidebar={true}
                signatureData={preparerSignature}
              />
            )}
        </div>
      )}
      {/* Desktop signature sidebars (unchanged) */}
      {pdfPreviewUrl && !isLoading && !isMobile && (
        <>
          <div className="hidden sm:flex flex-col items-center mb-4">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="consent-checkbox-desktop"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <label htmlFor="consent-checkbox-desktop" className="text-xs text-gray-700">
                I agree to sign this document electronically and acknowledge that my electronic signature is legally binding.
              </label>
            </div>
          </div>
          <div className="hidden sm:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-6 z-30 bg-white/90 border border-blue-100 rounded-2xl shadow-2xl p-4 animate-fade-in">
            <DraggableSignature
              id="user-provider"
              label="User E-sign"
              position={{ x: 0, y: 0 }}
              onSign={setUserSignature}
              sidebar={true}
              signatureData={userSignature}
            />
          </div>
          <div className="hidden sm:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-6 z-30 bg-white/90 border border-blue-100 rounded-2xl shadow-2xl p-4 animate-fade-in">
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
      {/* Progress Stepper */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 mb-6 mt-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm ${currentStep > step.id ? 'bg-green-400 text-white' : currentStep === step.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{step.id}</div>
            <span className={`ml-2 mr-4 text-sm ${currentStep >= step.id ? 'text-blue-900 font-semibold' : 'text-gray-400'}`}>{step.label}</span>
            {idx < steps.length - 1 && <div className="w-8 h-1 bg-gray-300 rounded-full" />}
          </div>
        ))}
      </div>
      {/* Role Switcher */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${activeRole === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveRole('user')}
        >
          User Signature
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${activeRole === 'preparer' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveRole('preparer')}
        >
          Tax Preparer Signature
        </button>
      </div>
      {/* Mobile signature guidance */}
      {isMobile && (
        <div className="w-full text-center text-blue-700 font-semibold mb-2 animate-fade-in">
          {activeRole === 'user' && !userSignature && 'Please provide and place your signature on the document.'}
          {activeRole === 'preparer' && !preparerSignature && 'Please provide and place the Tax Preparer signature.'}
        </div>
      )}
      <DndContext onDragEnd={handleDragEnd}>
        {submissionComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl bg-white/90 rounded-2xl shadow-2xl p-8 border border-blue-100 animate-fade-in mt-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-4 text-center">Signing Complete!</h1>
            <p className="text-gray-600 mb-6 text-center max-w-md">Your document has been successfully signed and submitted.</p>
            {signedPdfUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center w-full max-w-md">
                <p className="text-blue-700 font-medium mb-2">Signed Document Ready</p>
                <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                  Download Signed PDF
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
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-md justify-center">
              {onBack && (
                <Button onClick={onBack} variant="outline" className="w-full md:w-auto shadow-md">Back to Workflow</Button>
              )}
              <Button onClick={() => window.location.reload()} variant="secondary" className="w-full md:w-auto shadow-md">Start New Signing</Button>
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
              {/* Upload area - only show if no PDF is loaded and no ID/token in URL */}
              {!id && !token && !pdfPreviewUrl && (
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
                              setPdfError(error.message || 'Failed to load PDF file.');
                              console.error(error);
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
                              {/* Add 'Sign here' placeholders for User and Tax Preparer if not yet signed on this page */}
                              {pageNumber === 1 && !signaturesOnPages.some(sig => sig.page === 1 && sig.signature.name.includes('User')) && (
                                <div
                                  style={{ position: 'absolute', left: '10%', bottom: '10%', zIndex: 5 }}
                                  className="bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg p-2 text-center w-40 opacity-80"
                                >
                                  <p className="text-blue-700 font-semibold text-sm">User Sign Here</p>
                                  <p className="text-blue-500 text-xs">Drag signature</p>
                                </div>
                              )}
                              {pageNumber === 1 && !signaturesOnPages.some(sig => sig.page === 1 && sig.signature.name.includes('Tax Preparer')) && (
                                <div
                                  style={{ position: 'absolute', right: '10%', bottom: '10%', zIndex: 5 }}
                                  className="bg-green-100 border-2 border-dashed border-green-400 rounded-lg p-2 text-center w-40 opacity-80"
                                >
                                  <p className="text-green-700 font-semibold text-sm">Tax Preparer Sign Here</p>
                                  <p className="text-green-500 text-xs">Drag signature</p>
                                </div>
                              )}
                            </Page>
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
                      {onBack && (
                        <Button
                          onClick={onBack}
                          variant="outline"
                          className="w-full md:w-auto shadow-md"
                        >
                          Back
                        </Button>
                      )}
                      {emailSent && (
                        <div className="text-green-600 text-sm mt-2 text-center w-full md:w-auto">
                          {userSignature && !preparerSignature && 'Waiting for Tax Preparer signature...'}
                          {userSignature && preparerSignature && 'All signatures complete! Ready to submit.'}
                        </div>
                      )}
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
                      <div className="flex flex-col items-center w-full md:w-auto">
                        <Button
                          onClick={handleSubmitSignedPdf}
                          disabled={isSubmitting || signaturesOnPages.length < 2}
                          className="w-full md:w-auto shadow-md"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                        {signaturesOnPages.length < 2 && (
                          <span className="text-red-500 text-xs mt-1">Both User and Tax Preparer signatures required</span>
                        )}
                      </div>
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