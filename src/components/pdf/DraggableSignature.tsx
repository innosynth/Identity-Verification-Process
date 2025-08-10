import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Signature } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ESignature } from '../verification/ESignature';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SignatureInfo } from './SignatureInfo';

export interface SignatureData {
  signature: string;
  name: string;
  ipAddress: string;
  timestamp: string;
  width?: number;
  height?: number;
}

interface DraggableSignatureProps {
  id: string;
  label: string;
  position: { x: number; y: number };
  onSign: (signature: SignatureData) => void;
  sidebar?: boolean;
  signatureData?: SignatureData | null;
  disabled?: boolean;
  uploadMode?: boolean;
}

export const DraggableSignature = ({ id, label, position, onSign, sidebar, signatureData: propSignatureData, disabled, uploadMode }: DraggableSignatureProps) => {
  const [signatureData, setSignatureData] = useState<SignatureData | null>(propSignatureData || null);
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  useEffect(() => {
    if (propSignatureData) setSignatureData(propSignatureData);
  }, [propSignatureData]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Could not fetch IP'));
  }, []);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { signatureData: signatureData },
    disabled: !sidebar || !signatureData || disabled, // Only draggable if in sidebar and signatureData exists and not disabled
  });

  const style = sidebar
    ? { transform: CSS.Translate.toString(transform) }
    : { left: position.x, top: position.y, position: 'absolute' as const };

  const handleSignatureComplete = (signature: { type: "drawn" | "uploaded"; data: string }) => {
    const newSignatureData = {
      signature: signature.data,
      name,
      ipAddress,
      timestamp: new Date().toISOString(),
      width: 128, // Default width
      height: 64, // Default height
    };
    setSignatureData(newSignatureData);
    onSign(newSignatureData);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(sidebar && signatureData && !disabled ? { ...listeners, ...attributes } : {})}
      className={`z-20 max-w-xs w-64 sm:w-72 md:w-80 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-xl p-4 flex flex-col items-center animate-fade-in ${sidebar ? (signatureData && !disabled ? 'cursor-move' : '') : 'absolute'}`}
    >
      <div className="flex items-center w-full mb-2">
        {sidebar && signatureData && !disabled && (
          <div {...listeners} {...attributes} className="cursor-move mr-2 flex-shrink-0">
            <GripVertical className="h-6 w-6 text-yellow-700" />
          </div>
        )}
        <span className="font-semibold text-yellow-800 text-lg flex-1 text-center">{label}</span>
      </div>
      <div className="w-full">
        {signatureData ? (
          <div className="flex flex-col items-center">
            <img src={signatureData.signature} alt="Signature" className="w-full h-20 bg-white rounded shadow border object-contain" />
            <SignatureInfo name={signatureData.name} ipAddress={signatureData.ipAddress} timestamp={signatureData.timestamp} />
          </div>
        ) : (
          <>
            <Dialog>
              <DialogTrigger asChild disabled={disabled}>
                <Button variant="outline" size="sm" className="w-full mt-2 shadow-sm" disabled={disabled}>
                  <Signature className="mr-2 h-4 w-4" />
                  Provide Signature
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-full p-0 rounded-2xl overflow-hidden animate-fade-in">
                <DialogHeader className="bg-yellow-100 px-6 pt-6 pb-2 rounded-t-2xl">
                  <DialogTitle className="text-yellow-900 text-xl font-bold text-center">Provide Your Signature</DialogTitle>
                </DialogHeader>
                <div className="p-6 flex flex-col gap-4 bg-white">
                  <Input
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mb-2 text-base"
                    disabled={disabled}
                  />
                  <ESignature 
                    onSignatureComplete={handleSignatureComplete} 
                    onBack={() => {}} 
                    onSignLater={() => {}} 
                    onDecline={() => {}} 
                    uploadMode={uploadMode}
                  />
                </div>
              </DialogContent>
            </Dialog>
            {disabled && (
              <div className="text-xs text-yellow-700 mt-2 text-center opacity-60">You must agree to the legal notice before signing.</div>
            )}
            {!disabled && (
              <div className="text-xs text-yellow-700 mt-2 text-center">Please provide your signature before dragging.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 