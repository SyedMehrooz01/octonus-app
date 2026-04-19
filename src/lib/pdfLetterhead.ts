import jsPDF from "jspdf";
import { LETTERHEAD_BASE64 } from "@/lib/letterheadBase64";

export const generatePDFWithLetterhead = (
  doc: jsPDF,
  drawContent: (startY: number, endY: number) => void,
  fileName: string
) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const contentStartY = 38;
  const contentEndY = 262;

  doc.addImage(LETTERHEAD_BASE64, "JPEG", 0, 0, pageWidth, pageHeight);
  drawContent(contentStartY, contentEndY);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.addImage(LETTERHEAD_BASE64, "JPEG", 0, 0, pageWidth, pageHeight);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Page " + i + " of " + totalPages, pageWidth / 2, pageHeight - 6, { align: "center" });
  }

  doc.save(fileName);
};
