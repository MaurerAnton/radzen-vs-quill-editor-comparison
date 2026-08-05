window.compareQuill = {
    quill: null,
    dotNet: null,

    init: function (el, dotNet) {
        if (this.quill) return;
        this.dotNet = dotNet;
        this.quill = new Quill(el, {
            theme: 'snow',
            placeholder: 'Start typing...'
        });
        this.quill.on('text-change', function () {
            if (window.compareQuill.dotNet) {
                window.compareQuill.dotNet.invokeMethodAsync('OnQuillChange', window.compareQuill.quill.root.innerHTML);
            }
        });
    },

    getHtml: function () {
        return this.quill ? this.quill.root.innerHTML : '';
    },

    setHtml: function (html) {
        if (this.quill) {
            this.quill.clipboard.dangerouslyPasteHTML(html);
        }
    },

    insertSampleLink: function () {
        var q = this.quill;
        if (!q) return;
        var sel = q.getSelection();
        var index = sel && sel.index != null ? sel.index : q.getLength();
        var text = 'sample link';
        q.insertText(index, text, { link: 'https://example.com' });
        q.setSelection(index + text.length);
        q.focus();
    }
};
