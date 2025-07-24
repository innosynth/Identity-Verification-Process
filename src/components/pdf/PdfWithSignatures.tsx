import { Document, Page, Image, View, StyleSheet } from '@react-pdf/renderer';

interface PdfWithSignaturesProps {
  pdfFile: File;
  signatures: {
    user: { signature: string | null; position: { x: number; y: number } } | null;
    preparer: { signature: string | null; position: { x: number; y: number } } | null;
  };
  numPages: number;
}

interface SignatureData {
  signature: string;
  name: string;
  ipAddress: string;
  timestamp: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#E4E4E4',
  },
  signature: {
    position: 'absolute',
    width: '150px',
    height: '75px',
  },
  info: {
    position: 'absolute',
    left: 0,
    top: 80,
    fontSize: 8,
    color: '#000',
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 2,
    border: '1px solid #ccc',
  },
});

export const PdfWithSignatures = ({ pdfFile, signatures, numPages }: PdfWithSignaturesProps) => {
  // This component is used in TaxPreparerSign which passes signature data differently
  // We need to adapt to work with that structure
  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    pages.push(
      <Page key={i} size="A4" style={styles.page}>
        <Image src={pdfFile} />
        {/* We don't have signature metadata in this context, so we just show the signatures without info */}
        {signatures.user && signatures.user.signature && (
          <View style={{ ...styles.signature, left: signatures.user.position.x, top: signatures.user.position.y }}>
            <Image src={signatures.user.signature} />
          </View>
        )}
        {signatures.preparer && signatures.preparer.signature && (
          <View style={{ ...styles.signature, left: signatures.preparer.position.x, top: signatures.preparer.position.y }}>
            <Image src={signatures.preparer.signature} />
          </View>
        )}
      </Page>
    );
  }

  return <Document>{pages}</Document>;
};

// New component for handling signatures with full metadata
interface PdfWithMetadataSignaturesProps {
  pdfFile: File;
  signaturesByPage: {
    [page: number]: Array<{
      position: { x: number; y: number };
      signature: {
        signature: string;
        name: string;
        ipAddress: string;
        timestamp: string;
      };
    }>;
  };
  numPages: number;
}

export const PdfWithMetadataSignatures = ({ pdfFile, signaturesByPage, numPages }: PdfWithMetadataSignaturesProps) => {
  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    pages.push(
      <Page key={i} size="A4" style={styles.page}>
        <Image src={pdfFile} />
        {signaturesByPage[i] && signaturesByPage[i].map((sig, idx) => (
          <View key={idx} style={{ ...styles.signature, left: sig.position.x, top: sig.position.y }}>
            <Image src={sig.signature.signature} />
            <View style={styles.info}>
              <div>Signed by: {sig.signature.name}</div>
              <div>IP: {sig.signature.ipAddress}</div>
              <div>Date: {new Date(sig.signature.timestamp).toLocaleString()}</div>
            </View>
          </View>
        ))}
      </Page>
    );
  }

  return <Document>{pages}</Document>;
}; 