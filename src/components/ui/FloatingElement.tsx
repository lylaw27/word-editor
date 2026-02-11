import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
} from '@floating-ui/react';

interface FloatingElementProps {
  editor: Editor | null;
  shouldShow?: boolean;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offsetValue?: number;
}

/**
 * Get the bounding rectangle of the current editor selection
 */
function getSelectionBoundingRect(editor: Editor): DOMRect | null {
  const { view, state } = editor;
  const { from, to } = state.selection;

  if (from === to) return null;

  const start = view.coordsAtPos(from);
  const end = view.coordsAtPos(to);

  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);

  return {
    top,
    left,
    bottom,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
  } as DOMRect;
}

/**
 * FloatingElement component that positions UI relative to editor selection
 * Similar to TipTap's FloatingElement but simplified for our use case
 */
export function FloatingElement({
  editor,
  shouldShow = true,
  children,
  placement = 'top',
  offsetValue = 8,
}: FloatingElementProps) {
  const [isVisible, setIsVisible] = useState(false);
  const virtualElementRef = useRef({
    getBoundingClientRect: () => ({
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
    placement,
    middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Update the virtual element position based on editor selection
  useEffect(() => {
    if (!editor || !shouldShow) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      const rect = getSelectionBoundingRect(editor);
      
      if (rect) {
        virtualElementRef.current.getBoundingClientRect = () => rect;
        refs.setReference(virtualElementRef.current);
        setIsVisible(true);
        update();
      } else {
        setIsVisible(false);
      }
    };

    // Initial update
    updatePosition();

    // Listen to editor updates
    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor, shouldShow, refs, update]);

  if (!editor || !shouldShow || !isVisible) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          zIndex: 50,
        }}
      >
        {children}
      </div>
    </FloatingPortal>
  );
}
