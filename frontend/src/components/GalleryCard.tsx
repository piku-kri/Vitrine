import { useEffect, useState } from "react";
import { GalleryItem } from "../lib/contract";

interface GalleryCardProps {
  item: GalleryItem;
  isNew: boolean;
}

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function GalleryCard({ item, isNew }: GalleryCardProps) {
  const [revealing, setRevealing] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      setRevealing(true);
      const timeout = setTimeout(() => setRevealing(false), 900);
      return () => clearTimeout(timeout);
    }
  }, [isNew]);

  return (
    <div className={`gallery-card${revealing ? " gallery-card--reveal" : ""}`}>
      {revealing && <span className="gallery-card__spotlight" />}
      <div className="gallery-card__frame">
        <span className="gallery-card__id">No. {String(item.id).padStart(3, "0")}</span>
      </div>
      <div className="gallery-card__plaque">
        <div className="gallery-card__title">{item.title}</div>
        <div className="gallery-card__medium">{item.medium}</div>
        <div className="gallery-card__owner">owner {truncate(item.owner)}</div>
      </div>
    </div>
  );
}
