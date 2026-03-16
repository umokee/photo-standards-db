import { ImageDown } from "lucide-react";
import { useState } from "react";

export default function ImageWithFallback({ src, className, iconSize = 24 }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={className}>
        <ImageDown size={iconSize} />
      </div>
    );
  }
  return <img className={className} src={src} onError={() => setError(true)} />;
}
