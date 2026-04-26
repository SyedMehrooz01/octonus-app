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
 
     // Step 1: Add letterhead to first page BEFORE drawing content 
     doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 
 
     // Step 2: Draw all content - content drawing handles its own addPage() calls 
     drawContent(startY, endY); 
 
     // Step 3: NOW go back and add letterhead to pages 2+ that were created during content drawing 
     // We do this by iterating existing pages only - NO new pages created here 
     const totalPages = doc.getNumberOfPages(); 
     for (let i = 2; i <= totalPages; i++) { 
       doc.setPage(i); 
       // Save current content by drawing letterhead behind it 
       // We need to insert image at back - use setPage and addImage 
       doc.addImage(letterheadData, "JPEG", 0, 0, pageWidth, pageHeight); 
     } 
 
     // Step 4: Add page numbers on all pages 
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
