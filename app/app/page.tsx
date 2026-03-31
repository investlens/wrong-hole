import Link from "next/link";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-2xl">
          SPRM Balance: 0
        </div>
        <div className="bg-white/5 p-4 rounded-2xl">
          Claimable: 0
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/app/play"
          className="bg-fuchsia-500 px-6 py-3 rounded-2xl"
        >
          Play Now
        </Link>
      </div>
    </div>
  );
}