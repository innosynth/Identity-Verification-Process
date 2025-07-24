import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface IDocumentData {
  documentImages: {
    front: string;
    back?: string;
  };
  selfieVideo: Blob;
  signature: {
    type: "drawn" | "uploaded";
    data: string;
  };
}

export const generateVerificationPdf = async (data: IDocumentData): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Create a container for the content
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.padding = '20mm';
  container.style.backgroundColor = 'white';
  container.style.fontFamily = 'sans-serif';

  // Title
  const title = document.createElement('h1');
  title.innerText = 'Identity Verification Report';
  title.style.textAlign = 'center';
  title.style.marginBottom = '20px';
  container.appendChild(title);

  // Document Images
  const docImagesSection = document.createElement('div');
  docImagesSection.style.display = 'flex';
  docImagesSection.style.justifyContent = 'space-between';
  docImagesSection.style.marginBottom = '20px';

  const frontImage = document.createElement('img');
  frontImage.src = data.documentImages.front;
  frontImage.style.width = '48%';
  frontImage.style.borderRadius = '8px';
  docImagesSection.appendChild(frontImage);

  if (data.documentImages.back) {
    const backImage = document.createElement('img');
    backImage.src = data.documentImages.back;
    backImage.style.width = '48%';
    backImage.style.borderRadius = '8px';
    docImagesSection.appendChild(backImage);
  }
  container.appendChild(docImagesSection);

  // Selfie and Signature
  const selfieSignatureSection = document.createElement('div');
  selfieSignatureSection.style.display = 'flex';
  selfieSignatureSection.style.justifyContent = 'space-between';
  selfieSignatureSection.style.alignItems = 'center';

  const selfieVideo = document.createElement('video');
  selfieVideo.src = URL.createObjectURL(data.selfieVideo);
  selfieVideo.style.width = '48%';
  selfieVideo.style.borderRadius = '8px';
  selfieVideo.controls = true;
  selfieSignatureSection.appendChild(selfieVideo);

  const signatureImage = document.createElement('img');
  signatureImage.src = data.signature.data;
  signatureImage.style.width = '48%';
  signatureImage.style.border = '1px solid #ccc';
  signatureImage.style.borderRadius = '8px';
  selfieSignatureSection.appendChild(signatureImage);
  
  container.appendChild(selfieSignatureSection);

  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  pdf.save('verification-document.pdf');

  document.body.removeChild(container);
}; 