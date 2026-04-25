import jsPDF from "jspdf"; 
 
export const generatePDFWithLetterhead = async ( 
  doc: jsPDF, 
  drawContent: (startY: number, endY: number) => void, 
  fileName: string 
) => { 
  const pageWidth = 210; 
  const pageHeight = 297; 
  const endY = pageHeight - 32; 
 
  // Load letterhead from public folder 
  const loadImage = (): Promise<string> => { 
    return new Promise((resolve, reject) => { 
      const img = new Image(); 
      img.crossOrigin = "anonymous"; 
      img.src = "/letterhead.jpg"; 
      img.onload = () => { 
        const canvas = document.createElement("canvas"); 
        canvas.width = img.width; 
        canvas.height = img.height; 
        const ctx = canvas.getContext("2d"); 
        ctx?.drawImage(img, 0, 0); 
        resolve(canvas.toDataURL("image/jpeg")); 
      }; 
      img.onerror = () => reject(new Error("Failed to load letterhead")); 
    }); 
  }; 
 
  try { 
    const letterheadData = await loadImage(); 
 
    // Add letterhead to first page 
    doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 
 
    // Draw content 
    drawContent(48, endY); 
 
    // Apply letterhead to all pages and add page numbers 
    const totalPages = doc.getNumberOfPages(); 
    for (let i = 1; i <= totalPages; i++) { 
      doc.setPage(i); 
      if (i > 1) { 
        doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 
      } 
      doc.setFontSize(7); 
      doc.setTextColor(120, 120, 120); 
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: "center" }); 
    } 
 
    doc.save(fileName); 
  } catch (error) { 
    console.error("Letterhead load failed, saving without it:", error); 
    drawContent(48, endY); 
    doc.save(fileName); 
  } 
}; 
