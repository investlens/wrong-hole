export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* outer ring */}
      <div className="absolute h-full w-full rounded-full border border-pink-400/40" />

      {/* glow */}
      <div className="absolute h-2/3 w-2/3 rounded-full bg-pink-400/30 blur-md" />

      {/* core */}
      <div className="relative h-2 w-2 rounded-full bg-white" />
    </div>
  );
}