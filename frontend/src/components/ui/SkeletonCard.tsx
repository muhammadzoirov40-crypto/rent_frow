export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1A1A2E] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden animate-skeleton">
      <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
