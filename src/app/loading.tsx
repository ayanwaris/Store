export default function Loading() {
  return (
    <div className="container-x py-10">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-2 h-4 w-40" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] w-full rounded-xl" />
            <div className="skeleton mt-2 h-3 w-3/4" />
            <div className="skeleton mt-1.5 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
