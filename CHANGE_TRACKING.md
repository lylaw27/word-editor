# AI Editor Change Tracking

## Overview

The editor now includes visual change tracking for all AI-powered edits. When the AI modifies your document, changes are clearly marked with three distinct styles:

### Change Styles

1. **Deleted Text** (strikethrough + grey)
   - Shows text that was removed from the original
   - Styled with: `text-decoration: line-through; color: #999;`
   - Example: <span style="text-decoration: line-through; color: #999;">old phrase</span>

2. **New/Inserted Text** (green highlight)
   - Shows text that was added
   - Styled with: `background-color: #d4edda; color: #155724;`
   - Example: <span style="background-color: #d4edda; color: #155724;">new phrase</span>

3. **Unchanged Text** (original formatting)
   - Text that remains the same
   - No special styling applied

## Example Transformations

### Grammar Correction

**Before:**
```html
<p>The quick brown fox jump over the lazy dog.</p>
```

**After AI Edit:**
```html
<p>The quick brown fox <span style="text-decoration: line-through; color: #999;">jump</span> <span style="background-color: #d4edda; color: #155724;">jumps</span> over the lazy dog.</p>
```

### Rewording

**Before:**
```html
<p>I think this is a good idea.</p>
```

**After AI Edit:**
```html
<p><span style="text-decoration: line-through; color: #999;">I think this is</span> <span style="background-color: #d4edda; color: #155724;">This is</span> a <span style="text-decoration: line-through; color: #999;">good</span> <span style="background-color: #d4edda; color: #155724;">great</span> idea.</p>
```

### Content Expansion

**Before:**
```html
<p>Welcome to our app.</p>
```

**After AI Edit:**
```html
<p>Welcome to our <span style="text-decoration: line-through; color: #999;">app</span><span style="background-color: #d4edda; color: #155724;">innovative application that streamlines your workflow</span>.</p>
```

## Managing Changes

### Accept All Changes
Click the **Accept** button (green checkmark) in the toolbar to:
- Remove all deleted text
- Keep all new text without highlighting
- Clean the document of all change markers

### Reject All Changes
Click the **Reject** button (red X) in the toolbar to:
- Restore all deleted text
- Remove all new text
- Revert to the original content before AI edits

### Buttons Visibility
The Accept/Reject buttons only appear when there are tracked changes in the document.

## Implementation Details

### For AI Model (Tool Instructions)

The AI uses the `editTool` with visual change tracking. When generating `replaceHTML`:

```typescript
{
  searchHTML: "<p>The quick brown fox jump over the dog.</p>",
  replaceHTML: "<p>The quick brown fox <span style=\"text-decoration: line-through; color: #999;\">jump</span> <span style=\"background-color: #d4edda; color: #155724;\">jumps</span> over the <span style=\"background-color: #d4edda; color: #155724;\">lazy </span>dog.</p>"
}
```

### Styling Guidelines

**Deleted Text:**
```html
<span style="text-decoration: line-through; color: #999;">deleted content</span>
```

**New Text:**
```html
<span style="background-color: #d4edda; color: #155724;">new content</span>
```

**Unchanged Text:**
```html
Keep as-is without wrappers
```

### Utility Functions

Available in `/src/utils/changeTracking.ts`:

- `acceptAllChanges(html)` - Remove all markers, keep new text
- `rejectAllChanges(html)` - Restore original, remove new text
- `hasTrackedChanges(html)` - Check if changes exist
- `countChanges(html)` - Count additions and deletions

## User Interface

### Change Review Overlay

When the AI makes edits to your document, a **Change Review Overlay** automatically appears in the bottom-right corner of the editor. This overlay provides:

- **Summary of Changes**: Shows the number of additions and deletions
- **Visual Legend**: Explains the change markers (green for additions, strikethrough for deletions)
- **Quick Actions**:
  - **Accept All**: Apply all changes and remove visual markers
  - **Reject All**: Revert to original text before AI edits
  - **Close (×)**: Dismiss the overlay (changes remain tracked in the document)

### Toolbar Buttons

The editor toolbar also displays Accept/Reject buttons when tracked changes are present:

- **Accept Button** (green checkmark): Accept all changes
- **Reject Button** (red X): Reject all changes

These buttons appear dynamically only when changes exist in the document.

### Print Handling

When printing documents:
- Deleted text is hidden
- New text appears without highlighting
- Document prints clean without change markers

This is automatically handled via CSS `@media print` rules.
