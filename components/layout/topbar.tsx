export default function Topbar() {
  return (
    <div className="border-b border-white/10 bg-black/30 px-6 py-4 flex justify-between">
      <div>
        <div className="text-xs text-white/40">Stay in control</div>
        <div className="font-bold text-white">Wrong Hole Lab</div>
      </div>

      <div className="flex gap-3 text-sm">
        <div className="bg-white/5 px-3 py-1 rounded-xl">
          Claimable: 0 SPRM
        </div>
        <div className="bg-white/5 px-3 py-1 rounded-xl">
          Output: 0/hr
        </div>
      </div>
    </div>
  );
}