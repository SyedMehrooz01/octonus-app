import jsPDF from "jspdf";

export const generatePDFWithLetterhead = (
  doc: jsPDF,
  drawContent: (startY: number) => number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // First, add the letterhead to page 1 as the background
  try {
    doc.addImage("/letterhead.jpg", "JPEG", 0, 0, pageWidth, pageHeight);
  } catch (e) {
    console.warn("Letterhead image not found, skipping background", e);
  }

  // Now draw content on top
  const contentStartY = 40;
  const lastY = drawContent(contentStartY);
  
  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
  }
  
  return lastY;
};
