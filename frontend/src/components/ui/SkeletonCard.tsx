export default function SkeletonCard() {
  return (
    <div className="animate-skeleton bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
      <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-700" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-11/12" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-2/3" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-lg w-1/2" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-lg w-2/5" />
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-lg w-1/3 mt-1" />
        <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-1/2" />
      </div>
    </div>
  );
}
