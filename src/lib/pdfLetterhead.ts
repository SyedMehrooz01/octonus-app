import jsPDF from "jspdf"; 
 
export const generatePDFWithLetterhead = async ( 
   doc: jsPDF, 
   drawContent: (startY: number, endY: number) => void, 
   fileName: string 
 ) => { 
   const pageWidth = 210; 
   const pageHeight = 297; 
   const startY = 48; 
   const endY = pageHeight - 32; 
 
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

    // Step 1: Wrap addPage to add letterhead to any new pages automatically 
    const originalAddPage = doc.addPage.bind(doc); 
    doc.addPage = function() { 
      const result = originalAddPage(); 
      doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 
      return result; 
    }; 

    // Step 2: Add letterhead to first page BEFORE drawing content 
    doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 

    // Step 3: Draw all content - content drawing handles its own addPage() calls 
    drawContent(startY, endY); 

    // Step 4: Add page numbers on all pages 
    const totalPages = doc.getNumberOfPages(); 
    for (let i = 1; i <= totalPages; i++) { 
      doc.setPage(i); 
      doc.setFontSize(7); 
      doc.setTextColor(120, 120, 120); 
      doc.text( 
        `Page ${i} of ${totalPages}`, 
        pageWidth / 2, 
        pageHeight - 6, 
        { align: "center" } 
      ); 
    } 

    doc.save(fileName); 
   } catch (error) { 
     console.error("Letterhead load failed:", error); 
     drawContent(startY, endY); 
     doc.save(fileName); 
   } 
 }; 
