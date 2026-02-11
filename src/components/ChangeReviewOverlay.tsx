import { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Check, X, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { countChanges } from '../utils/changeTracking';
import {
  useFloating,
  offset,
  shift,
  autoUpdate,
  FloatingPortal,
} from '@floating-ui/react';

interface ChangeReviewOverlayProps {
  editor: Editor;
  html: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

/**
 * Get the bounding rectangle for the first tracked change in the editor
 */
function getFirstChangeBoundingRect(editor: Editor): DOMRect | null {
  const { view } = editor;
  
  // Look for the first element with change tracking marks
  // TipTap renders strike marks as <s> and highlight marks as <mark>
  const editorElement = view.dom;
  const changeElement = editorElement.querySelector(
    's[style*="color"], mark[style*="background-color: rgb(212, 237, 218)"]'
  ) || editorElement.querySelector(
    'span[style*="text-decoration: line-through"], span[style*="background-color: #d4edda"]'
  );
  
  if (changeElement) {
    return changeElement.getBoundingClientRect();
  }
  
  // Fallback: return editor's bounding rect
  return editorElement.getBoundingClientRect();
}

/**
 * Overlay component for reviewing and approving AI-generated changes
 * Uses floating-ui to position itself near the tracked changes
 */
export default function ChangeReviewOverlay({ 
  editor,
  html, 
  onAccept, 
  onReject, 
  onClose 
}: ChangeReviewOverlayProps) {
  // Count changes from JSON for accuracy
  const json = editor.getJSON();
  const { additions, deletions } = countChanges(json);
  const totalChanges = additions + deletions;
  
  const virtualElementRef = useRef({
    getBoundingClientRect: () => getFirstChangeBoundingRect(editor) || ({
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    } as DOMRect),
  });

  const { refs, floatingStyles, update } = useFloating({
    placement: 'bottom-end',
    middleware: [
      offset({ mainAxis: 16, crossAxis: 16 }),
      shift({ padding: 16 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Update position when changes are detected
  useEffect(() => {
    refs.setReference(virtualElementRef.current);
    update();
  }, [html, refs, update]);

  if (totalChanges === 0) return null;

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          zIndex: 50,
        }}
        className="animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 w-80">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Info size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Review AI Changes
            </h3>
            <p className="text-sm text-gray-600">
              The AI has made {totalChanges} change{totalChanges !== 1 ? 's' : ''} to your document.
            </p>
          </div>
        </div>

        {/* Change Summary */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
          {additions > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Added text:</span>
              <span className="font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                {additions}
              </span>
            </div>
          )}
          {deletions > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Deleted text:</span>
              <span className="font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                {deletions}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-2">Change markers:</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                New text
              </span>
              <span className="text-gray-600">- Added content</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="line-through text-gray-500">Old text</span>
              <span className="text-gray-600">- Removed content</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check size={16} className="mr-1" />
            Accept All
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
          >
            <X size={16} className="mr-1" />
            Reject All
          </Button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      </div>
    </FloatingPortal>
  );
}
