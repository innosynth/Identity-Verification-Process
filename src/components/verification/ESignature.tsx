import { useState, useRef, useEffect } from "react";
import { PenTool, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ESignatureProps {
  onSignatureComplete: (signature: { type: "drawn" | "uploaded"; data: string }) => void;
  onBack: () => void;
  onSignLater: () => void;
  onDecline: () => void;
}

export const ESignature = ({ onSignatureComplete, onBack, onSignLater, onDecline }: ESignatureProps) => {
  const [signatureType, setSignatureType] = useState<"drawn" | "uploaded">("drawn");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [envelope, setEnvelope] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const envelopeData = sessionStorage.getItem('envelope');
    if (envelopeData) {
      setEnvelope(JSON.parse(envelopeData));
    }
  }, []);

  useEffect(() => {
    if (signatureType === "drawn" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
      }
    }
  }, [signatureType]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsSigning(true);

      const draw = (moveEvent: MouseEvent) => {
        if (!isSigning) return;
        const newRect = canvas.getBoundingClientRect();
        const newX = moveEvent.clientX - newRect.left;
        const newY = moveEvent.clientY - newRect.top;
        ctx.lineTo(newX, newY);
        ctx.stroke();
      };

      const stop = () => {
        setIsSigning(false);
        ctx.closePath();
        const dataUrl = canvas.toDataURL("image/png");
        setSignatureData(dataUrl);
        window.removeEventListener("mousemove", draw);
        window.removeEventListener("mouseup", stop);
      };

      window.addEventListener("mousemove", draw);
      window.addEventListener("mouseup", stop);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setSignatureData(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureComplete = () => {
    if (signatureData) {
      onSignatureComplete({
        type: signatureType,
        data: signatureData
      });
      // Update envelope status to signed
      if (envelope) {
        const updatedEnvelope = { ...envelope, status: 'signed', signature: signatureData };
        sessionStorage.setItem('envelope', JSON.stringify(updatedEnvelope));
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Add Your Signature</h2>
        <p className="text-muted-foreground">
          Sign the documents in your envelope
        </p>
        {envelope && envelope.documents && (
          <p className="text-sm text-primary mt-2">Documents to sign: {envelope.documents.length}</p>
        )}
      </div>

      <Card className="p-6 mb-6">
        <div className="flex justify-center space-x-4 mb-6">
          <Button
            variant={signatureType === "drawn" ? "default" : "outline"}
            onClick={() => setSignatureType("drawn")}
          >
            <PenTool className="w-4 h-4 mr-2" />
            Draw Signature
          </Button>
          <Button
            variant={signatureType === "uploaded" ? "default" : "outline"}
            onClick={() => setSignatureType("uploaded")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Signature
          </Button>
        </div>

        {signatureType === "drawn" ? (
          <div className="border border-dashed border-muted rounded-lg p-4 relative bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              width={500}
              height={200}
              className="w-full h-full touch-none"
            />
            {!signatureData && (
              <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
                Click and drag to draw your signature
              </p>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-muted rounded-lg p-8 text-center bg-white">
            {!signatureData ? (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">Upload a saved signature image</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </>
            ) : (
              <img src={signatureData} alt="Uploaded Signature" className="max-h-40 mx-auto" />
            )}
          </div>
        )}

        {signatureData && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSignatureData(null);
                if (signatureType === "uploaded" && fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSignatureComplete}
          disabled={!signatureData}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Apply Signature
        </Button>
      </div>
      <div className="mt-4 text-center space-x-4">
        <Button variant="link" onClick={onSignLater}>
          Sign Later
        </Button>
        <Button variant="link" onClick={onDecline} className="text-red-500">
          Decline to Sign
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