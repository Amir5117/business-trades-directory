/**
 * YouTube — robust, static 16:9 embed. Accepts a bare id OR any YouTube URL
 * (watch?v=, youtu.be/, /embed/, /shorts/). youtube-nocookie + lazy-load.
 * No client JS, no animation libraries — pure static markup + CSS.
 */
function extractId(input?: string): string {
  if (!input) return "";
  const s = String(input).trim();
  if (/^[\w-]{6,15}$/.test(s)) return s; // already a bare id
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,15})/);
  return m ? m[1] : "";
}

export function YouTube({ id, url, title = "Video" }: { id?: string; url?: string; title?: string }) {
  const vid = extractId(id || url);
  if (!vid) return null;
  return (
    <div className="relative my-6 aspect-video overflow-hidden rounded-xl ring-1 ring-line">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${vid}`}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

export default YouTube;
