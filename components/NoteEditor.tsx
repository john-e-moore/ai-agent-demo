type NoteEditorProps = {
  note: string;
  onNoteChange: (value: string) => void;
  onSave: (value: string) => void;
};

export function NoteEditor({ note, onNoteChange, onSave }: NoteEditorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800">
            Chart note
          </span>
          <span className="text-[10px] text-slate-500">
            Saved per series selection in your browser (localStorage only).
          </span>
        </div>
      </div>
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={3}
        placeholder="Add a short note about what you see in this chart…"
        className="min-h-[72px] resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          Notes are not synced to a server and will only be available in this
          browser.
        </span>
        <button
          type="button"
          onClick={() => onSave(note)}
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
        >
          Save note
        </button>
      </div>
    </div>
  );
}


