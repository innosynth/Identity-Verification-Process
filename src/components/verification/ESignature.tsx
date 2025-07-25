import { useState, useRef, useEffect } from "react";
import { PenTool, Upload, RotateCcw, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ESignatureProps {
  onSignatureComplete: (signatureData: { type: "drawn" | "uploaded"; data: string }) => void;
  onBack: () => void;
}

export const ESignature = ({ onSignatureComplete, onBack }: ESignatureProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Set drawing styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Convert to PNG data URL using canvas, and resize if needed
      const img = new window.Image();
      img.onload = function () {
        // Set max dimensions
        const MAX_WIDTH = 512;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;
        // Calculate new size while preserving aspect ratio
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const widthRatio = MAX_WIDTH / width;
          const heightRatio = MAX_HEIGHT / height;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const pngDataUrl = canvas.toDataURL('image/png');
          // Check size (e.g., 500KB = 500*1024 = 512000 bytes)
          const base64Length = pngDataUrl.length - 'data:image/png;base64,'.length;
          const fileSizeBytes = Math.ceil(base64Length * 3 / 4); // base64 to bytes
          if (fileSizeBytes > 512000) {
            alert('The signature image is too large after resizing (max 500KB). Please upload a smaller image.');
            setUploadedSignature(null);
            return;
          }
          setUploadedSignature(pngDataUrl);
        } else {
          // fallback: use original
          setUploadedSignature(result);
        }
      };
      img.onerror = function () {
        // fallback: use original
        setUploadedSignature(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const getSignatureData = () => {
    if (activeTab === "draw" && hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        return {
          type: "drawn" as const,
          data: canvas.toDataURL("image/png")
        };
      }
    } else if (activeTab === "upload" && uploadedSignature) {
      return {
        type: "uploaded" as const,
        data: uploadedSignature
      };
    }
    return null;
  };

  const handleContinue = () => {
    const signatureData = getSignatureData();
    if (signatureData) {
      onSignatureComplete(signatureData);
    }
  };

  const canContinue = (activeTab === "draw" && hasSignature) || (activeTab === "upload" && uploadedSignature);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Electronic Signature</h2>
        <p className="text-muted-foreground">
          Create your digital signature to complete the verification process
        </p>
      </div>

      <Card className="p-6 mb-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "draw" | "upload")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="draw" className="flex items-center">
              <PenTool className="w-4 h-4 mr-2" />
              Draw Signature
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <canvas
                ref={canvasRef}
                className="w-full h-32 border border-border rounded cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Draw your signature above using your mouse or finger
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={clearCanvas} 
                variant="outline" 
                size="sm"
                disabled={!hasSignature}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedSignature ? (
                <div className="space-y-4">
                  <img 
                    src={uploadedSignature} 
                    alt="Uploaded signature" 
                    className="max-h-20 mx-auto"
                  />
                  <div className="flex items-center justify-center text-success">
                    <Check className="w-4 h-4 mr-2" />
                    Signature uploaded successfully
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Upload Signature Image</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a PNG or JPG file of your signature
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {uploadedSignature && (
              <Button 
                onClick={() => {
                  setUploadedSignature(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                variant="outline" 
                size="sm"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Choose Different Image
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Preview Section */}
      {canContinue && (
        <Card className="p-4 mb-6 bg-verification-bg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-success-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Signature Ready</p>
              <p className="text-sm text-muted-foreground">
                Your signature will be attached to your verification documents
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue} className="flex-1">
          Complete Verification
        </Button>
      </div>
      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => (window as any).setShowDeviceSwitch(true)}>
          Continue on another device
        </Button>
      </div>
    </div>
  );
};