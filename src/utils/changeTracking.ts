/**
 * Change Tracking Utilities
 * 
 * Helper functions for managing AI edit change tracking in the editor.
 * These utilities help visualize and manage changes made by AI edits.
 */

/**
 * Remove all change tracking markers from HTML
 * This accepts all changes and returns clean HTML without visual markers
 * 
 * @param html - The HTML content with change tracking markers
 * @returns Clean HTML with deleted text removed and new text unmarked
 */
export function acceptAllChanges(html: string): string {
  // Remove deleted text (strikethrough spans)
  let cleanHTML = html.replace(
    /<span style="text-decoration: line-through; color: #999;">.*?<\/span>\s*/g,
    ''
  );
  
  // Remove green highlight wrapper from new text but keep the text
  cleanHTML = cleanHTML.replace(
    /<span style="background-color: #d4edda; color: #155724;">(.*?)<\/span>/g,
    '$1'
  );
  
  return cleanHTML;
}

/**
 * Reject all changes and restore to original text
 * Removes new text and un-strikes deleted text
 * 
 * @param html - The HTML content with change tracking markers
 * @returns HTML with only the original text (deleted text restored, new text removed)
 */
export function rejectAllChanges(html: string): string {
  // Remove new text (green highlight spans)
  let originalHTML = html.replace(
    /<span style="background-color: #d4edda; color: #155724;">.*?<\/span>\s*/g,
    ''
  );
  
  // Restore deleted text by removing the strikethrough wrapper
  originalHTML = originalHTML.replace(
    /<span style="text-decoration: line-through; color: #999;">(.*?)<\/span>/g,
    '$1'
  );
  
  return originalHTML;
}

/**
 * Count the number of changes in the HTML or JSON
 * Supports both HTML-based tracking and TipTap mark-based tracking
 * 
 * @param htmlOrJson - The HTML content or editor JSON to check
 * @returns Object with counts of additions and deletions
 */
export function countChanges(htmlOrJson: string | any): { additions: number; deletions: number } {
  // If it's a string (HTML), check for inline styles
  if (typeof htmlOrJson === 'string') {
    const html = htmlOrJson;
    const deletionMatches = html.match(/<span style="text-decoration: line-through; color: #999;">/g);
    const additionMatches = html.match(/<span style="background-color: #d4edda; color: #155724;">/g);
    
    // Also check for TipTap's mark-based output
    const strikeMatches = html.match(/<s [^>]*style="[^"]*color: rgb\(153, 153, 153\)[^"]*"/g);
    const highlightMatches = html.match(/<mark [^>]*style="[^"]*background-color: rgb\(212, 237, 218\)[^"]*"/g);
    
    return {
      additions: (additionMatches?.length || 0) + (highlightMatches?.length || 0),
      deletions: (deletionMatches?.length || 0) + (strikeMatches?.length || 0),
    };
  }
  
  // If it's JSON, count marks
  if (typeof htmlOrJson === 'object') {
    return countChangesInJSON(htmlOrJson);
  }
  
  return { additions: 0, deletions: 0 };
}

/**
 * Recursively count change tracking marks in JSON
 */
function countChangesInJSON(node: any): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  
  if (!node) return { additions, deletions };
  
  // Check if this text node has change tracking marks
  if (node.type === 'text' && node.marks) {
    const hasStrike = node.marks.some((m: any) => m.type === 'strike');
    const hasGrayColor = node.marks.some((m: any) => 
      m.type === 'textStyle' && m.attrs?.color === '#999999'
    );
    const hasGreenHighlight = node.marks.some((m: any) =>
      m.type === 'highlight' && m.attrs?.color === '#d4edda'
    );
    
    if (hasStrike && hasGrayColor) {
      deletions++;
    }
    if (hasGreenHighlight) {
      additions++;
    }
  }
  
  // Recursively count in content array
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      const childCounts = countChangesInJSON(child);
      additions += childCounts.additions;
      deletions += childCounts.deletions;
    }
  }
  
  return { additions, deletions };
}

/**
 * Check if there are any tracked changes in the HTML or JSON
 * Supports both HTML-based tracking and TipTap mark-based tracking
 * 
 * @param htmlOrJson - The HTML content or editor JSON to check
 * @returns True if there are any tracked changes
 */
export function hasTrackedChanges(htmlOrJson: string | any): boolean {
  // If it's a string (HTML), check for inline styles
  if (typeof htmlOrJson === 'string') {
    const html = htmlOrJson;
    const hasDeletedHTML = html.includes('text-decoration: line-through; color: #999;');
    const hasNewHTML = html.includes('background-color: #d4edda; color: #155724;');
    
    // Also check for TipTap's mark-based output
    const hasStrikeAndGray = html.includes('<s ') && html.includes('color: rgb(153, 153, 153)');
    const hasHighlightGreen = html.includes('background-color: rgb(212, 237, 218)');
    
    return hasDeletedHTML || hasNewHTML || hasStrikeAndGray || hasHighlightGreen;
  }
  
  // If it's JSON, check for marks
  if (typeof htmlOrJson === 'object') {
    return hasTrackedChangesInJSON(htmlOrJson);
  }
  
  return false;
}

/**
 * Recursively check JSON for change tracking marks
 */
function hasTrackedChangesInJSON(node: any): boolean {
  if (!node) return false;
  
  // Check if this text node has change tracking marks
  if (node.type === 'text' && node.marks) {
    const hasStrike = node.marks.some((m: any) => m.type === 'strike');
    const hasGrayColor = node.marks.some((m: any) => 
      m.type === 'textStyle' && m.attrs?.color === '#999999'
    );
    const hasGreenHighlight = node.marks.some((m: any) =>
      m.type === 'highlight' && m.attrs?.color === '#d4edda'
    );
    
    if ((hasStrike && hasGrayColor) || hasGreenHighlight) {
      return true;
    }
  }
  
  // Recursively check content array
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      if (hasTrackedChangesInJSON(child)) {
        return true;
      }
    }
  }
  
  return false;
}
