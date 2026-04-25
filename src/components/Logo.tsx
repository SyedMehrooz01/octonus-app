const Logo = ({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" | "xl" }) => { 
   const sizes = { 
     sm: "h-8 w-auto", 
     md: "h-12 w-auto", 
     lg: "h-20 w-auto", 
     xl: "h-32 w-auto" 
   }; 
   return ( 
     <img 
       src="/logo.png" 
       alt="Octonus Solutions" 
       className={`${sizes[size]} object-contain ${className}`} 
     /> 
   ); 
 }; 
 export default Logo; 
