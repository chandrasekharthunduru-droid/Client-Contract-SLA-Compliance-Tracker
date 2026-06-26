import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, size = 'md', children, footer }) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col animate-slide-up`}>
        <div className="modal-header flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scroll">
          <div className="modal-body">{children}</div>
        </div>
        {footer && <div className="modal-footer flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
