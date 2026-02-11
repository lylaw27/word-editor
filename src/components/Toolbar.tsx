import { Editor } from '@tiptap/react';
import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Save,
  Type,
  Check,
  X,
} from 'lucide-react';
import { acceptAllChanges, rejectAllChanges, hasTrackedChanges } from '../utils/changeTracking';

interface ToolbarProps {
  editor: Editor;
  onSave: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-2" />;
}

const FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'monospace', label: 'Monospace' },
];

const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
  { value: '36px', label: '36' },
  { value: '48px', label: '48' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF',
  '#F3F3F3', '#FFFFFF', '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF',
  '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
];

const HIGHLIGHT_COLORS = [
  '#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000', '#FFA500',
  '#FFCCFF', '#CCFFFF', '#CCFFCC', '#FFFFCC', '#FFE6CC', '#FFD9E6',
];


export default function Toolbar({ editor, onSave }: ToolbarProps) {
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);

  const currentHTML = editor.getHTML();
  const showChangeButtons = hasTrackedChanges(currentHTML);

  const handleAcceptChanges = () => {
    const cleanHTML = acceptAllChanges(currentHTML);
    editor.commands.setContent(cleanHTML);
  };

  const handleRejectChanges = () => {
    const originalHTML = rejectAllChanges(currentHTML);
    editor.commands.setContent(originalHTML);
  };

  return (
    <div className="flex items-center gap-1 pb-4 mb-4 border-b border-gray-200 flex-wrap">
      {/* Save Button */}
      <ToolbarButton onClick={onSave} title="Save (⌘S)">
        <Save size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Change Tracking Buttons - only show when there are tracked changes */}
      {showChangeButtons && (
        <>
          <ToolbarButton 
            onClick={handleAcceptChanges}
            title="Accept All Changes"
          >
            <div className="flex items-center gap-1">
              <Check size={18} className="text-green-600" />
              <span className="text-xs">Accept</span>
            </div>
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleRejectChanges}
            title="Reject All Changes"
          >
            <div className="flex items-center gap-1">
              <X size={18} className="text-red-600" />
              <span className="text-xs">Reject</span>
            </div>
          </ToolbarButton>
          <ToolbarDivider />
        </>
      )}

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (⌘Z)"
      >
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (⌘⇧Z)"
      >
        <Redo size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Font Family */}
      <select
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        value={editor.getAttributes('textStyle').fontFamily || ''}
        className="toolbar-select"
        title="Font Family"
      >
        {FONT_FAMILIES.map(font => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <select
        onChange={(e) => {
          editor.chain().focus().setFontSize(e.target.value).run();
        }}
        value={editor.getAttributes('textStyle').fontSize || '16px'}
        className="toolbar-select"
        title="Font Size"
        style={{ width: '70px' }}
      >
        {FONT_SIZES.map(size => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (⌘B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (⌘I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (⌘U)"
      >
        <Underline size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Color */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowTextColorPicker(!showTextColorPicker);
            setShowHighlightColorPicker(false);
          }}
          title="Text Color"
        >
          <div className="flex flex-col items-center">
            <Type size={18} />
            <div 
              className="w-4 h-1 mt-0.5 rounded"
              style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
            />
          </div>
        </ToolbarButton>
        {showTextColorPicker && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-300 rounded shadow-lg z-50">
            <div className="grid grid-cols-10 gap-1 w-64">
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowTextColorPicker(false);
                  }}
                  className="w-6 h-6 border border-gray-300 rounded hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setShowTextColorPicker(false);
              }}
              className="mt-2 w-full text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Highlight Color */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowHighlightColorPicker(!showHighlightColorPicker);
            setShowTextColorPicker(false);
          }}
          isActive={editor.isActive('highlight')}
          title="Highlight Color"
        >
          <Highlighter size={18} />
        </ToolbarButton>
        {showHighlightColorPicker && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-300 rounded shadow-lg z-50">
            <div className="grid grid-cols-7 gap-1 w-56">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color }).run();
                    setShowHighlightColorPicker(false);
                  }}
                  className="w-6 h-6 border border-gray-300 rounded hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setShowHighlightColorPicker(false);
              }}
              className="mt-2 w-full text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Remove Highlight
            </button>
          </div>
        )}
      </div>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <Code size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justify"
      >
        <AlignJustify size={18} />
      </ToolbarButton>
    </div>
  );
}

