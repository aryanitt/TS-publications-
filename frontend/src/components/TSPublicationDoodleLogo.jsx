/** TS Publication brand logo */

export const TS_PUBLICATION_LOGO_SRC = "/ts-publication-logo.png";

export default function TSPublicationDoodleLogo({ size = 36, className = "", showBackground = true }) {
  const radius = size >= 40 ? "rounded-xl" : "rounded-lg";

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${showBackground ? "bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)]" : ""} ${radius} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={TS_PUBLICATION_LOGO_SRC}
        alt="TS Publication"
        className="w-full h-full object-contain p-0.5"
        draggable={false}
      />
    </div>
  );
}
