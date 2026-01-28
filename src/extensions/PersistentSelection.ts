import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Custom extension to keep selection visible when editor loses focus
export const PersistentSelection = Extension.create({
  name: 'persistentSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('persistentSelection'),
        
        state: {
          init() {
            return { from: null, to: null };
          },
          apply(tr, prev) {
            // Store the current selection
            const { from, to } = tr.selection;
            return { from, to };
          },
        },

        props: {
          decorations(state) {
            const { from, to } = this.getState(state);
            
            // Only show decoration if there's a selection and editor is not focused
            if (from !== null && to !== null && from !== to && !this.spec.key.getState(state)?.hasFocus) {
              return DecorationSet.create(state.doc, [
                Decoration.inline(from, to, {
                  class: 'inactive-selection',
                }),
              ]);
            }
            
            return DecorationSet.empty;
          },

          // Track focus state
          handleDOMEvents: {
            blur: (view) => {
              // Force a decoration update on blur
              const { from, to } = view.state.selection;
              if (from !== to) {
                view.dispatch(view.state.tr.setMeta('persistentSelection', { hasFocus: false }));
              }
              return false;
            },
            focus: (view) => {
              // Remove decorations on focus
              view.dispatch(view.state.tr.setMeta('persistentSelection', { hasFocus: true }));
              return false;
            },
          },
        },
      }),
    ];
  },
});
