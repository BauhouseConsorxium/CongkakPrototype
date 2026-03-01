export default function Panel({ children, className = '' }) {
  return (
    <div className={`bg-surface-1 rounded-[10px] p-2.5 ${className}`}>
      {children}
    </div>
  );
}
