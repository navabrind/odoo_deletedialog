
odoo.define('odoo13_deletedialog.extra', function(require) {
"use strict";

// var editable_ListRenderer = require('web.EditableListRenderer');
var ListRenderer = require('web.ListRenderer');

ListRenderer.include({
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     * @private
     */
    /**
     * Triggers a delete event. I don't know why we stop the propagation of the
     * event.
     *
     * @param {MouseEvent} event
     */
    _onRemoveIconClick: function (event) {
        event.stopPropagation();
        var result = confirm("Are you sure you want to delete this record?");
        if (result){
        var id = $(event.target).closest('tr').data('id');
        this.trigger_up('list_record_remove', {id: id});
        }
    }
});

});