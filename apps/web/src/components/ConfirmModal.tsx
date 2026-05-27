interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm',
  description = 'Are you sure?',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    // backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onCancel}
        aria-hidden
      />

      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 z-10">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            className="px-4 py-2 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
