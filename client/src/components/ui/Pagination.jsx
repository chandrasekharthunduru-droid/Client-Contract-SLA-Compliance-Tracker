import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
      <span className="text-sm text-gray-400">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span> results
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          let pageNum;
          if (pages <= 7) pageNum = i + 1;
          else if (page <= 4) pageNum = i + 1;
          else if (page >= pages - 3) pageNum = pages - 6 + i;
          else pageNum = page - 3 + i;
          return (
            <button key={pageNum} onClick={() => onPageChange(pageNum)}
              className={`btn btn-sm min-w-[36px] ${page === pageNum ? 'btn-primary' : 'btn-secondary'}`}>
              {pageNum}
            </button>
          );
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page === pages}
          className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
