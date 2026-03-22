import React from "react";

interface SkeletonProps {
  type: "table" | "grid" | "list" | "stats";
  count?: number;
}

const SkeletonLoading = ({ type, count = 5 }: SkeletonProps) => {
  if (type === "table") {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-12 w-full bg-muted rounded-xl mb-6" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-muted/40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-64 w-full bg-muted/40 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (type === "stats") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 w-full bg-muted/40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 w-full bg-muted/40 rounded-xl" />
      ))}
    </div>
  );
};

export default SkeletonLoading;
