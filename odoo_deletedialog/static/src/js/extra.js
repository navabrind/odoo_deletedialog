odoo.define('navabrind_extra.extra', function (require) {
    "use strict";
    var core = require('web.core');
    var common = require('web.form_common');
    var data = require('web.data');
    var Model = require('web.Model');
    var View = require('web.View');
    var KanbanView = require('web_kanban.KanbanView');
    var _t = core._t;
    var _lt = core._lt;
    var QWeb = core.qweb;
    var ListView = require('web.ListView');
    var dataset = require("web.data");
    var Widget = require("web.Widget");
    var WebClient = require('web.web_client');
    var Session = require('web.session');

    ListView.List.include({
        init: function (group, opts) {
            var self = this;
            this.group = group;
            this.view = group.view;
            this.session = this.view.session;

            this.options = opts.options;
            this.columns = opts.columns;
            this.dataset = opts.dataset;
            this.records = opts.records;
            this.record_callbacks = {
                'remove': function (event, record) {
                    var id = record.get('id');
                    self.dataset.remove_ids([id]);
                    var $row = self.$current.children('[data-id=' + id + ']');
                    var index = $row.data('index');
                    $row.remove();
                },
                'reset': function () { return self.on_records_reset(); },
                'change': function (event, record, attribute, value, old_value) {
                    var $row;
                    if (attribute === 'id') {
                        if (old_value) {
                            throw new Error(_.str.sprintf( _t("Setting 'id' attribute on existing record %s"),
                                JSON.stringify(record.attributes) ));
                        }
                        self.dataset.add_ids([value], self.records.indexOf(record));
                        // Set id on new record
                        $row = self.$current.children('[data-id=false]');
                    } else {
                        $row = self.$current.children(
                            '[data-id=' + record.get('id') + ']');
                    }
                    if ($row.length) {
                        var $newRow = $(self.render_record(record));
                        $newRow.find('.o_list_record_selector input').prop('checked', !!$row.find('.o_list_record_selector input').prop('checked'));
                        $row.replaceWith($newRow);
                    }
                },
                'add': function (ev, records, record, index) {
                    var $new_row = $(self.render_record(record));
                    var id = record.get('id');
                    if (id) { self.dataset.add_ids([id], index); }

                    if (index === 0) {
                        $new_row.prependTo(self.$current);
                    } else {
                        var previous_record = records.at(index-1),
                            $previous_sibling = self.$current.children(
                                    '[data-id=' + previous_record.get('id') + ']');
                        $new_row.insertAfter($previous_sibling);
                    }
                }
            };
            _(this.record_callbacks).each(function (callback, event) {
                this.records.bind(event, callback);
            }, this);

            this.$current = $('<tbody>')
                .delegate('input[readonly=readonly]', 'click', function (e) {
                    /*
                        Against all logic and sense, as of right now @readonly
                        apparently does nothing on checkbox and radio inputs, so
                        the trick of using @readonly to have, well, readonly
                        checkboxes (which still let clicks go through) does not
                        work out of the box. We *still* need to preventDefault()
                        on the event, otherwise the checkbox's state *will* toggle
                        on click
                     */
                    e.preventDefault();
                })
                .delegate('td.o_list_record_selector', 'click', function (e) {
                    e.stopPropagation();
                    var selection = self.get_selection();
                    var checked = $(e.currentTarget).find('input').prop('checked');
                    $(self).trigger(
                            'selected', [selection.ids, selection.records, ! checked]);
                })
                .delegate('td.o_list_record_delete', 'click', function (e) {
                    e.stopPropagation();
                    var result = confirm("Are you sure you want to delete this record?");
                    if (result){
                        var $row = $(e.target).closest('tr');
                        $(self).trigger('deleted', [[self.row_id($row)]]);
                        // IE Edge go crazy when we use confirm dialog and remove the focused element
                        if(document.hasFocus && !document.hasFocus()) {
                            $('<input />').appendTo('body').focus().remove();
                        }
                    }
                })
                .delegate('td button', 'click', function (e) {
                    e.stopPropagation();
                    var $target = $(e.currentTarget),
                          field = $target.closest('td').data('field'),
                           $row = $target.closest('tr'),
                      record_id = self.row_id($row);

                    if ($target.attr('disabled')) {
                        return;
                    }
                    $target.attr('disabled', 'disabled');

                    // note: $.data converts data to number if it's composed only
                    // of digits, nice when storing actual numbers, not nice when
                    // storing strings composed only of digits. Force the action
                    // name to be a string
                    $(self).trigger('action', [field.toString(), record_id, function (id) {
                        $target.removeAttr('disabled');
                        return self.reload_record(self.records.get(id));
                    }]);
                })
                .delegate('a', 'click', function (e) {
                    e.stopPropagation();
                })
                .delegate('tr', 'click', function (e) {
                    var row_id = self.row_id(e.currentTarget);
                    if (row_id) {
                        e.stopPropagation();
                        if (!self.dataset.select_id(row_id)) {
                            throw new Error(_t("Could not find id in dataset"));
                        }
                        self.row_clicked(e);
                    }
                })
                .delegate('td.o_list_record_copy', 'click', function (e) {
                    e.stopPropagation();
                    var $row = $(e.target).closest('tr');
                    var id = $row[0].dataset.id;
                    var model_name = self.dataset.model;
                    $.ajax({
                           url: '/web/dataset/get_record',
                           data:{
                            'model':model_name,
                            'id':id,
                           },
                           success: function(res) {
                                new Model(model_name).call('search_read', [[['id', '=', res]]], {}, {async: false})
                                .then(function(record){
                                    if(record && record[0]){
                                        self.records.add(record[0], {silent: false});
                                        self.dataset.trigger('dataset_changed');
                                    }
                                });
                           },

                    });
                });
        },
    });
});
