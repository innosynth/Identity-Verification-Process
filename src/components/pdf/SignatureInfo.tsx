interface SignatureInfoProps {
  name: string;
  ipAddress: string;
  timestamp: string;
}

export const SignatureInfo = ({ name, ipAddress, timestamp }: SignatureInfoProps) => {
  return (
    <div className="text-xs text-gray-500 mt-2">
      <p>
        <strong>Signed by:</strong> {name}
      </p>
      <p>
        <strong>IP Address:</strong> {ipAddress}
      </p>
      <p>
        <strong>Date:</strong> {new Date(timestamp).toLocaleString()}
      </p>
    </div>
  );
}; 