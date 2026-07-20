const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { uploadBufferToCloudinary } = require('./cloudinaryUpload');

// Renders a simple, print-ready completion certificate. Layout is deliberately
// minimal (light-blue rule + serif title) so it reads as an official
// DTU/NSS document rather than a template graphic.
//
// The PDF is built entirely in memory (chunks collected into a Buffer, never
// written to disk) and uploaded straight to Cloudinary — this is the piece
// that makes certificate issuing safe on an ephemeral/serverless filesystem.
async function generateCertificatePdf({ studentName, rollNo, totalHours, totalPoints, certificateId, issuedAt }) {
  const verifyUrl = `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/verify/${certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0 });
  const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;

    doc.rect(20, 20, pageWidth - 40, doc.page.height - 40).lineWidth(2).stroke('#1E88E5');
    doc.rect(30, 30, pageWidth - 60, doc.page.height - 60).lineWidth(0.75).stroke('#90CAF9');

    doc.fontSize(12).fillColor('#1565C0').text('DELHI TECHNOLOGICAL UNIVERSITY', 0, 70, { align: 'center' });
    doc.fontSize(10).fillColor('#5F6368').text('National Service Scheme — Value Added Course', { align: 'center' });

    doc.moveDown(1.5);
    doc.fontSize(30).fillColor('#0D47A1').text('Certificate of Completion', { align: 'center' });

    doc.moveDown(1);
    doc.fontSize(12).fillColor('#333').text('This certifies that', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(24).fillColor('#0D47A1').text(studentName, { align: 'center' });
    doc.fontSize(11).fillColor('#5F6368').text(rollNo ? `Roll No: ${rollNo}` : '', { align: 'center' });

    doc.moveDown(1);
    doc.fontSize(12).fillColor('#333').text(
      `has successfully completed the NSS Value Added Course requirements, contributing ${totalHours} hours of ` +
      `community service and earning ${totalPoints} activity points.`,
      { align: 'center', width: pageWidth - 160, indent: 0 }
    );

    doc.moveDown(2);
    const bottomY = doc.page.height - 110;
    doc.fontSize(9).fillColor('#777').text(`Certificate ID: ${certificateId}`, 60, bottomY);
    doc.text(`Issued: ${new Date(issuedAt).toLocaleDateString()}`, 60, bottomY + 14);
    doc.text('NSS Programme Officer', pageWidth - 220, bottomY + 14, { width: 160, align: 'center' });
    doc.moveTo(pageWidth - 220, bottomY + 10).lineTo(pageWidth - 60, bottomY + 10).stroke('#999');

    // Public verification QR — anyone (a recruiter, the university office)
    // can scan this to confirm the certificate is real without needing an
    // account, which is what makes it more than a printable image.
    doc.image(qrImageBuffer, pageWidth / 2 - 35, bottomY - 15, { width: 70 });
    doc.fontSize(7).fillColor('#999').text('Scan to verify', pageWidth / 2 - 35, bottomY + 58, { width: 70, align: 'center' });

    doc.end();
  });

  const uploaded = await uploadBufferToCloudinary(pdfBuffer, {
    folder: 'nss-vac-erp/certificates',
    resourceType: 'raw', // PDFs must go through Cloudinary as 'raw', not 'image'
    publicId: certificateId,
  });

  return uploaded.secure_url;
}

module.exports = { generateCertificatePdf };
