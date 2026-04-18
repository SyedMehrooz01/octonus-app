import jsPDF from "jspdf";

export const generatePDFWithLetterhead = (
  doc: jsPDF,
  drawContent: (startY: number) => number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = () => {
    // Top-left diagonal stripe decoration
    doc.setFillColor(0, 188, 212);
    doc.triangle(0, 0, 32, 0, 0, 20, "F");
    doc.setFillColor(139, 195, 74);
    doc.triangle(0, 0, 22, 0, 0, 14, "F");
    doc.setFillColor(0, 150, 136);
    doc.triangle(0, 0, 12, 0, 0, 8, "F");

    // Two thin horizontal lines
    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.5);
    doc.line(34, 7, pageWidth - 5, 7);
    doc.setDrawColor(139, 195, 74);
    doc.setLineWidth(0.3);
    doc.line(34, 10, pageWidth - 5, 10);

    // Company branding circle
    doc.setFillColor(240, 248, 240);
    doc.circle(pageWidth - 22, 15, 13, "F");
    doc.setDrawColor(139, 195, 74);
    doc.setLineWidth(0.5);
    doc.circle(pageWidth - 22, 15, 13, "S");

    // Company name
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(9);
    doc.setTextColor(76, 153, 0);
    doc.text("Octonus", pageWidth - 28, 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Solutions", pageWidth - 27, 18);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.text("A SPECTACULAR TURN OF EVENTS", pageWidth - 35, 23);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    // Olive green footer bar
    doc.setFillColor(101, 114, 57);
    doc.rect(0, pageHeight - 22, pageWidth, 22, "F");

    // Decorative triangles bottom-right
    doc.setFillColor(0, 188, 212);
    doc.triangle(pageWidth, pageHeight - 14, pageWidth, pageHeight, pageWidth - 20, pageHeight, "F");
    doc.setFillColor(139, 195, 74);
    doc.triangle(pageWidth, pageHeight - 8, pageWidth, pageHeight, pageWidth - 12, pageHeight, "F");

    // Three footer columns
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    // Left: Address
    doc.setFillColor(210, 105, 30);
    doc.circle(14, pageHeight - 14, 3, "F");
    doc.text("Office No. 2, Crown Centre,", 19, pageHeight - 15);
    doc.text("Gulshan-e-Iqbal, Karachi", 19, pageHeight - 10);

    // Center: Email + Website
    doc.setFillColor(210, 105, 30);
    doc.circle(pageWidth / 2 - 18, pageHeight - 14, 3, "F");
    doc.text("octonussolutions@gmail.com", pageWidth / 2 - 12, pageHeight - 15);
    doc.text("www.octonussolutions.com.pk", pageWidth / 2 - 12, pageHeight - 10);

    // Right: Phones
    doc.setFillColor(210, 105, 30);
    doc.circle(pageWidth - 42, pageHeight - 14, 3, "F");
    doc.text("+92 331 3195 292", pageWidth - 37, pageHeight - 15);
    doc.text("021 34 977 797", pageWidth - 37, pageHeight - 10);

    // Page numbers
    doc.setFontSize(6.5);
    doc.setTextColor(200, 220, 180);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: "center" });
  };

  // First draw header on page 1
  drawHeader();

  // Then draw content
  const contentStartY = 32;
  drawContent(contentStartY);

  // Now process all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader();
    drawFooter(i, totalPages);
  }
};
