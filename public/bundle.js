
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.SvelteChartCss = factory());
})(this, (function () { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/SvelteChartCss.svelte generated by Svelte v3.46.6 */

    const { Object: Object_1 } = globals;
    const file = "src/SvelteChartCss.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[34] = i;
    	return child_ctx;
    }

    const get_legend_slot_changes = dirty => ({ datasets: dirty[0] & /*datasets*/ 4 });
    const get_legend_slot_context = ctx => ({ datasets: /*datasets*/ ctx[2] });

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	child_ctx[40] = i;
    	return child_ctx;
    }

    const get_data_slot_changes = dirty => ({
    	value: dirty[0] & /*rows*/ 128,
    	formattedValue: dirty[0] & /*formatDataValue, rows*/ 144
    });

    const get_data_slot_context = ctx => ({
    	value: /*value*/ ctx[38],
    	formattedValue: /*formatDataValue*/ ctx[4](/*value*/ ctx[38].valueRaw)
    });

    const get_label_slot_changes = dirty => ({
    	label: dirty[0] & /*labels, rows*/ 130,
    	labelIndex: dirty[0] & /*rows*/ 128
    });

    const get_label_slot_context = ctx => ({
    	label: /*labels*/ ctx[1][/*rowIndex*/ ctx[37]],
    	labelIndex: /*rowIndex*/ ctx[37]
    });

    const get_heading_slot_changes = dirty => ({ heading: dirty[0] & /*heading*/ 1 });
    const get_heading_slot_context = ctx => ({ heading: /*heading*/ ctx[0] });

    // (140:8) {#if heading !== null || $$slots.heading}
    function create_if_block_2(ctx) {
    	let caption;
    	let current;
    	const heading_slot_template = /*#slots*/ ctx[29].heading;
    	const heading_slot = create_slot(heading_slot_template, ctx, /*$$scope*/ ctx[28], get_heading_slot_context);
    	const heading_slot_or_fallback = heading_slot || fallback_block_3(ctx);

    	const block = {
    		c: function create() {
    			caption = element("caption");
    			if (heading_slot_or_fallback) heading_slot_or_fallback.c();
    			attr_dev(caption, "class", "heading");
    			add_location(caption, file, 140, 12, 4571);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, caption, anchor);

    			if (heading_slot_or_fallback) {
    				heading_slot_or_fallback.m(caption, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (heading_slot) {
    				if (heading_slot.p && (!current || dirty[0] & /*$$scope, heading*/ 268435457)) {
    					update_slot_base(
    						heading_slot,
    						heading_slot_template,
    						ctx,
    						/*$$scope*/ ctx[28],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[28])
    						: get_slot_changes(heading_slot_template, /*$$scope*/ ctx[28], dirty, get_heading_slot_changes),
    						get_heading_slot_context
    					);
    				}
    			} else {
    				if (heading_slot_or_fallback && heading_slot_or_fallback.p && (!current || dirty[0] & /*heading*/ 1)) {
    					heading_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heading_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heading_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(caption);
    			if (heading_slot_or_fallback) heading_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(140:8) {#if heading !== null || $$slots.heading}",
    		ctx
    	});

    	return block;
    }

    // (142:57) {heading}
    function fallback_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*heading*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*heading*/ 1) set_data_dev(t, /*heading*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_3.name,
    		type: "fallback",
    		source: "(142:57) {heading}",
    		ctx
    	});

    	return block;
    }

    // (151:90) {labels[rowIndex]}
    function fallback_block_2(ctx) {
    	let t_value = /*labels*/ ctx[1][/*rowIndex*/ ctx[37]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*labels, rows*/ 130 && t_value !== (t_value = /*labels*/ ctx[1][/*rowIndex*/ ctx[37]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_2.name,
    		type: "fallback",
    		source: "(151:90) {labels[rowIndex]}",
    		ctx
    	});

    	return block;
    }

    // (157:113)                                  
    function fallback_block_1(ctx) {
    	let t_value = /*formatDataValue*/ ctx[4](/*value*/ ctx[38].valueRaw) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formatDataValue, rows*/ 144 && t_value !== (t_value = /*formatDataValue*/ ctx[4](/*value*/ ctx[38].valueRaw) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(157:113)                                  ",
    		ctx
    	});

    	return block;
    }

    // (161:24) {#if value.tooltip}
    function create_if_block_1(ctx) {
    	let span;
    	let t_value = /*value*/ ctx[38].tooltip + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "tooltip");
    			add_location(span, file, 161, 28, 5480);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rows*/ 128 && t_value !== (t_value = /*value*/ ctx[38].tooltip + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(161:24) {#if value.tooltip}",
    		ctx
    	});

    	return block;
    }

    // (154:16) {#each row as value, colIndex (colIndex)}
    function create_each_block_2(key_1, ctx) {
    	let td;
    	let span;
    	let t;
    	let td_style_value;
    	let current;
    	const data_slot_template = /*#slots*/ ctx[29].data;
    	const data_slot = create_slot(data_slot_template, ctx, /*$$scope*/ ctx[28], get_data_slot_context);
    	const data_slot_or_fallback = data_slot || fallback_block_1(ctx);
    	let if_block = /*value*/ ctx[38].tooltip && create_if_block_1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			td = element("td");
    			span = element("span");
    			if (data_slot_or_fallback) data_slot_or_fallback.c();
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(span, "class", "data");
    			add_location(span, file, 155, 24, 5140);
    			attr_dev(td, "style", td_style_value = /*resolveDataStyle*/ ctx[9](/*value*/ ctx[38], /*rowIndex*/ ctx[37], /*colIndex*/ ctx[40]));
    			add_location(td, file, 154, 20, 5055);
    			this.first = td;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, span);

    			if (data_slot_or_fallback) {
    				data_slot_or_fallback.m(span, null);
    			}

    			append_dev(td, t);
    			if (if_block) if_block.m(td, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (data_slot) {
    				if (data_slot.p && (!current || dirty[0] & /*$$scope, rows, formatDataValue*/ 268435600)) {
    					update_slot_base(
    						data_slot,
    						data_slot_template,
    						ctx,
    						/*$$scope*/ ctx[28],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[28])
    						: get_slot_changes(data_slot_template, /*$$scope*/ ctx[28], dirty, get_data_slot_changes),
    						get_data_slot_context
    					);
    				}
    			} else {
    				if (data_slot_or_fallback && data_slot_or_fallback.p && (!current || dirty[0] & /*formatDataValue, rows*/ 144)) {
    					data_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}

    			if (/*value*/ ctx[38].tooltip) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(td, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty[0] & /*rows*/ 128 && td_style_value !== (td_style_value = /*resolveDataStyle*/ ctx[9](/*value*/ ctx[38], /*rowIndex*/ ctx[37], /*colIndex*/ ctx[40]))) {
    				attr_dev(td, "style", td_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(data_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(data_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			if (data_slot_or_fallback) data_slot_or_fallback.d(detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(154:16) {#each row as value, colIndex (colIndex)}",
    		ctx
    	});

    	return block;
    }

    // (148:12) {#each rows as row,rowIndex (rowIndex) }
    function create_each_block_1(key_1, ctx) {
    	let tr;
    	let th;
    	let t0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t1;
    	let current;
    	const label_slot_template = /*#slots*/ ctx[29].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[28], get_label_slot_context);
    	const label_slot_or_fallback = label_slot || fallback_block_2(ctx);
    	let each_value_2 = /*row*/ ctx[35];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*colIndex*/ ctx[40];
    	validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2(key, child_ctx));
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			tr = element("tr");
    			th = element("th");
    			if (label_slot_or_fallback) label_slot_or_fallback.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			attr_dev(th, "scope", "row");
    			add_location(th, file, 149, 16, 4821);
    			add_location(tr, file, 148, 12, 4800);
    			this.first = tr;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th);

    			if (label_slot_or_fallback) {
    				label_slot_or_fallback.m(th, null);
    			}

    			append_dev(tr, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t1);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (label_slot) {
    				if (label_slot.p && (!current || dirty[0] & /*$$scope, labels, rows*/ 268435586)) {
    					update_slot_base(
    						label_slot,
    						label_slot_template,
    						ctx,
    						/*$$scope*/ ctx[28],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[28])
    						: get_slot_changes(label_slot_template, /*$$scope*/ ctx[28], dirty, get_label_slot_changes),
    						get_label_slot_context
    					);
    				}
    			} else {
    				if (label_slot_or_fallback && label_slot_or_fallback.p && (!current || dirty[0] & /*labels, rows*/ 130)) {
    					label_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}

    			if (dirty[0] & /*resolveDataStyle, rows, formatDataValue, $$scope*/ 268436112) {
    				each_value_2 = /*row*/ ctx[35];
    				validate_each_argument(each_value_2);
    				group_outros();
    				validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, tr, outro_and_destroy_block, create_each_block_2, t1, get_each_context_2);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(label_slot_or_fallback, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(label_slot_or_fallback, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(148:12) {#each rows as row,rowIndex (rowIndex) }",
    		ctx
    	});

    	return block;
    }

    // (173:4) {#if ( $$slots.legend || showLegend ) && datasets.length > 0}
    function create_if_block(ctx) {
    	let current;
    	const legend_slot_template = /*#slots*/ ctx[29].legend;
    	const legend_slot = create_slot(legend_slot_template, ctx, /*$$scope*/ ctx[28], get_legend_slot_context);
    	const legend_slot_or_fallback = legend_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (legend_slot_or_fallback) legend_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (legend_slot_or_fallback) {
    				legend_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (legend_slot) {
    				if (legend_slot.p && (!current || dirty[0] & /*$$scope, datasets*/ 268435460)) {
    					update_slot_base(
    						legend_slot,
    						legend_slot_template,
    						ctx,
    						/*$$scope*/ ctx[28],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[28])
    						: get_slot_changes(legend_slot_template, /*$$scope*/ ctx[28], dirty, get_legend_slot_changes),
    						get_legend_slot_context
    					);
    				}
    			} else {
    				if (legend_slot_or_fallback && legend_slot_or_fallback.p && (!current || dirty[0] & /*legendClasses, datasets*/ 260)) {
    					legend_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(legend_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(legend_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (legend_slot_or_fallback) legend_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(173:4) {#if ( $$slots.legend || showLegend ) && datasets.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (179:12) {#each datasets as dataset, index (index + '' + datasets.length)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let t0_value = /*dataset*/ ctx[32].name + "";
    	let t0;
    	let t1;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(li, file, 179, 12, 5997);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*datasets*/ 4 && t0_value !== (t0_value = /*dataset*/ ctx[32].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(179:12) {#each datasets as dataset, index (index + '' + datasets.length)}",
    		ctx
    	});

    	return block;
    }

    // (177:5)          
    function fallback_block(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*datasets*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*index*/ ctx[34] + '' + /*datasets*/ ctx[2].length;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", /*legendClasses*/ ctx[8]);
    			add_location(ul, file, 177, 8, 5878);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*datasets*/ 4) {
    				each_value = /*datasets*/ ctx[2];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty[0] & /*legendClasses*/ 256) {
    				attr_dev(ul, "class", /*legendClasses*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(177:5)          ",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let table;
    	let t0;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t1;
    	let current;
    	let if_block0 = (/*heading*/ ctx[0] !== null || /*$$slots*/ ctx[10].heading) && create_if_block_2(ctx);
    	let each_value_1 = /*rows*/ ctx[7];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*rowIndex*/ ctx[37];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	let if_block1 = (/*$$slots*/ ctx[10].legend || /*showLegend*/ ctx[3]) && /*datasets*/ ctx[2].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block1) if_block1.c();
    			add_location(tbody, file, 146, 8, 4727);
    			attr_dev(table, "class", /*chartClasses*/ ctx[5]);
    			add_location(table, file, 136, 4, 4465);
    			attr_dev(div, "class", "svelte-charts-css");
    			attr_dev(div, "style", /*style*/ ctx[6]);
    			add_location(div, file, 135, 0, 4413);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			if (if_block0) if_block0.m(table, null);
    			append_dev(table, t0);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*heading*/ ctx[0] !== null || /*$$slots*/ ctx[10].heading) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*heading, $$slots*/ 1025) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(table, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*rows, resolveDataStyle, formatDataValue, $$scope, labels*/ 268436114) {
    				each_value_1 = /*rows*/ ctx[7];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, tbody, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (!current || dirty[0] & /*chartClasses*/ 32) {
    				attr_dev(table, "class", /*chartClasses*/ ctx[5]);
    			}

    			if ((/*$$slots*/ ctx[10].legend || /*showLegend*/ ctx[3]) && /*datasets*/ ctx[2].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$$slots, showLegend, datasets*/ 1036) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*style*/ 64) {
    				attr_dev(div, "style", /*style*/ ctx[6]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let style;
    	let legendClasses;
    	let chartClasses;
    	let datasetsCount;
    	let hasHeading;
    	let rows;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SvelteChartCss', slots, ['heading','label','data','legend']);
    	const $$slots = compute_slots(slots);
    	let { type } = $$props;
    	let { heading = null } = $$props;
    	let { headingSize = "1rem" } = $$props;
    	let { showHeading = false } = $$props;
    	let { labels } = $$props;
    	let { showLabels = false } = $$props;
    	let { dataSpacing = 0 } = $$props;
    	let { hideData = false } = $$props;
    	let { showDataAxis = false } = $$props;
    	let { showDataOnHover = false } = $$props;
    	let { datasets } = $$props;
    	let { showLegend = false } = $$props;
    	let { legendInline = true } = $$props;
    	let { legendType = "square" } = $$props;
    	let { showTooltips = false } = $$props;

    	let { resolveDataTooltip = (value, label, datasetName, rowIndex, colIndex, hasMultipleDatasets = false) => {
    		return (datasetName && hasMultipleDatasets ? datasetName : label) + ": " + value;
    	} } = $$props;

    	let { reverse = false } = $$props;
    	let { stacked = false } = $$props;
    	let { classes = null } = $$props;
    	let { color = null } = $$props;
    	let { formatDataValue = value => value } = $$props;
    	let { resolveDataColor = () => null } = $$props;

    	/**
     * Returns the mapped rendering CSS style for the given value, row and column.
     * @param value
     * @param rowIndex
     * @param colIndex
     * @return {{"--size", "--start"}}
     */
    	function resolveDataStyle(value, rowIndex, colIndex) {
    		let style = {
    			'--start': value.start,
    			'--size': value.size
    		};

    		if (resolveDataColor) {
    			const color = resolveDataColor(value, value.label, value.datasetName, rowIndex, colIndex, datasetsCount > 1);

    			if (color) {
    				style["--color"] = color;
    			}
    		}

    		return Object.entries(style).map(([key, value]) => {
    			return key + ":" + value;
    		}).join(";");
    	}

    	const writable_props = [
    		'type',
    		'heading',
    		'headingSize',
    		'showHeading',
    		'labels',
    		'showLabels',
    		'dataSpacing',
    		'hideData',
    		'showDataAxis',
    		'showDataOnHover',
    		'datasets',
    		'showLegend',
    		'legendInline',
    		'legendType',
    		'showTooltips',
    		'resolveDataTooltip',
    		'reverse',
    		'stacked',
    		'classes',
    		'color',
    		'formatDataValue',
    		'resolveDataColor'
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SvelteChartCss> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(11, type = $$props.type);
    		if ('heading' in $$props) $$invalidate(0, heading = $$props.heading);
    		if ('headingSize' in $$props) $$invalidate(12, headingSize = $$props.headingSize);
    		if ('showHeading' in $$props) $$invalidate(13, showHeading = $$props.showHeading);
    		if ('labels' in $$props) $$invalidate(1, labels = $$props.labels);
    		if ('showLabels' in $$props) $$invalidate(14, showLabels = $$props.showLabels);
    		if ('dataSpacing' in $$props) $$invalidate(15, dataSpacing = $$props.dataSpacing);
    		if ('hideData' in $$props) $$invalidate(16, hideData = $$props.hideData);
    		if ('showDataAxis' in $$props) $$invalidate(17, showDataAxis = $$props.showDataAxis);
    		if ('showDataOnHover' in $$props) $$invalidate(18, showDataOnHover = $$props.showDataOnHover);
    		if ('datasets' in $$props) $$invalidate(2, datasets = $$props.datasets);
    		if ('showLegend' in $$props) $$invalidate(3, showLegend = $$props.showLegend);
    		if ('legendInline' in $$props) $$invalidate(19, legendInline = $$props.legendInline);
    		if ('legendType' in $$props) $$invalidate(20, legendType = $$props.legendType);
    		if ('showTooltips' in $$props) $$invalidate(21, showTooltips = $$props.showTooltips);
    		if ('resolveDataTooltip' in $$props) $$invalidate(22, resolveDataTooltip = $$props.resolveDataTooltip);
    		if ('reverse' in $$props) $$invalidate(23, reverse = $$props.reverse);
    		if ('stacked' in $$props) $$invalidate(24, stacked = $$props.stacked);
    		if ('classes' in $$props) $$invalidate(25, classes = $$props.classes);
    		if ('color' in $$props) $$invalidate(26, color = $$props.color);
    		if ('formatDataValue' in $$props) $$invalidate(4, formatDataValue = $$props.formatDataValue);
    		if ('resolveDataColor' in $$props) $$invalidate(27, resolveDataColor = $$props.resolveDataColor);
    		if ('$$scope' in $$props) $$invalidate(28, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		type,
    		heading,
    		headingSize,
    		showHeading,
    		labels,
    		showLabels,
    		dataSpacing,
    		hideData,
    		showDataAxis,
    		showDataOnHover,
    		datasets,
    		showLegend,
    		legendInline,
    		legendType,
    		showTooltips,
    		resolveDataTooltip,
    		reverse,
    		stacked,
    		classes,
    		color,
    		formatDataValue,
    		resolveDataColor,
    		resolveDataStyle,
    		datasetsCount,
    		rows,
    		hasHeading,
    		chartClasses,
    		legendClasses,
    		style
    	});

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate(11, type = $$props.type);
    		if ('heading' in $$props) $$invalidate(0, heading = $$props.heading);
    		if ('headingSize' in $$props) $$invalidate(12, headingSize = $$props.headingSize);
    		if ('showHeading' in $$props) $$invalidate(13, showHeading = $$props.showHeading);
    		if ('labels' in $$props) $$invalidate(1, labels = $$props.labels);
    		if ('showLabels' in $$props) $$invalidate(14, showLabels = $$props.showLabels);
    		if ('dataSpacing' in $$props) $$invalidate(15, dataSpacing = $$props.dataSpacing);
    		if ('hideData' in $$props) $$invalidate(16, hideData = $$props.hideData);
    		if ('showDataAxis' in $$props) $$invalidate(17, showDataAxis = $$props.showDataAxis);
    		if ('showDataOnHover' in $$props) $$invalidate(18, showDataOnHover = $$props.showDataOnHover);
    		if ('datasets' in $$props) $$invalidate(2, datasets = $$props.datasets);
    		if ('showLegend' in $$props) $$invalidate(3, showLegend = $$props.showLegend);
    		if ('legendInline' in $$props) $$invalidate(19, legendInline = $$props.legendInline);
    		if ('legendType' in $$props) $$invalidate(20, legendType = $$props.legendType);
    		if ('showTooltips' in $$props) $$invalidate(21, showTooltips = $$props.showTooltips);
    		if ('resolveDataTooltip' in $$props) $$invalidate(22, resolveDataTooltip = $$props.resolveDataTooltip);
    		if ('reverse' in $$props) $$invalidate(23, reverse = $$props.reverse);
    		if ('stacked' in $$props) $$invalidate(24, stacked = $$props.stacked);
    		if ('classes' in $$props) $$invalidate(25, classes = $$props.classes);
    		if ('color' in $$props) $$invalidate(26, color = $$props.color);
    		if ('formatDataValue' in $$props) $$invalidate(4, formatDataValue = $$props.formatDataValue);
    		if ('resolveDataColor' in $$props) $$invalidate(27, resolveDataColor = $$props.resolveDataColor);
    		if ('datasetsCount' in $$props) datasetsCount = $$props.datasetsCount;
    		if ('rows' in $$props) $$invalidate(7, rows = $$props.rows);
    		if ('hasHeading' in $$props) hasHeading = $$props.hasHeading;
    		if ('chartClasses' in $$props) $$invalidate(5, chartClasses = $$props.chartClasses);
    		if ('legendClasses' in $$props) $$invalidate(8, legendClasses = $$props.legendClasses);
    		if ('style' in $$props) $$invalidate(6, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*headingSize, color, style*/ 67113024) {
    			$$invalidate(6, style = (function () {
    				let style = `--heading-size: ${headingSize};`;

    				if (color) {
    					style += `--color: ${color};`;
    				}

    				return style;
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*showLegend, legendInline, legendType*/ 1572872) {
    			$$invalidate(8, legendClasses = (function () {
    				if (showLegend) {
    					return "charts-css legend " + (legendInline ? 'legend-inline' : '') + " legend-" + legendType;
    				}

    				return "";
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*datasets, reverse, showHeading, hideData, showDataOnHover, showDataAxis, showLabels, stacked, dataSpacing, type, classes*/ 59238404) {
    			$$invalidate(5, chartClasses = (function () {
    				let propClasses = {
    					"multiple": datasets.length > 1,
    					reverse,
    					"show-heading": showHeading,
    					"hide-data": hideData,
    					"show-data-on-hover": showDataOnHover,
    					"show-data-axis": showDataAxis,
    					"show-labels": showLabels,
    					stacked
    				};

    				if (dataSpacing) {
    					propClasses["data-spacing-" + dataSpacing] = true;
    				}

    				let propClassesString = Object.keys(propClasses).reduce(
    					(carry, chartClass) => {
    						if (propClasses[chartClass]) {
    							carry += " " + chartClass;
    						}

    						return carry;
    					},
    					""
    				);

    				let chartClasses = `charts-css ${type} ` + propClassesString + " " + (classes ? classes : '');
    				return chartClasses.trim();
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*datasets*/ 4) {
    			datasetsCount = (function () {
    				return datasets.length;
    			})();
    		}

    		if ($$self.$$.dirty[0] & /*datasets, type, resolveDataTooltip, showTooltips, labels*/ 6293510) {
    			/**
     * Converts from datasets schema to Charts.CSS rendering.
     * @return {array}
     */
    			$$invalidate(7, rows = (function () {
    				/**
     * get highest value in values, so we can calculate scale between 0.0 and 1.0
     * @type {Number}
     */
    				const max = Math.max(...datasets.reduce(
    					(carry, dataset) => {
    						carry = carry.concat(dataset.values);
    						return carry;
    					},
    					[]
    				));

    				const chartType = type;

    				return datasets.reduce(
    					(carry, dataset, index) => {
    						/**
     * Map dataset to each column
     */
    						dataset.values.forEach((value, valueIndex) => {
    							if (typeof carry[valueIndex] === "undefined") {
    								carry[valueIndex] = [];
    							}

    							let tooltip = resolveDataTooltip && showTooltips
    							? resolveDataTooltip(value, labels[valueIndex], dataset.name, valueIndex, valueIndex, datasets.length > 1)
    							: null;

    							let mappedValue = {
    								valueRaw: value,
    								valueIndex,
    								datasetName: dataset.name,
    								datasetIndex: index,
    								label: labels[valueIndex],
    								tooltip
    							};

    							if (chartType === "column" || chartType === "bar") {
    								mappedValue.size = value / max;
    							}

    							if (chartType === "area" || chartType === "line") {
    								mappedValue.start = value / max;

    								mappedValue.size = dataset.values[valueIndex + 1]
    								? dataset.values[valueIndex + 1] / max
    								: 0;
    							}

    							carry[valueIndex].push(mappedValue);
    						});

    						return carry;
    					},
    					[]
    				);
    			})());
    		}
    	};

    	hasHeading = (function () {
    		return !!$$slots.heading;
    	})();

    	return [
    		heading,
    		labels,
    		datasets,
    		showLegend,
    		formatDataValue,
    		chartClasses,
    		style,
    		rows,
    		legendClasses,
    		resolveDataStyle,
    		$$slots,
    		type,
    		headingSize,
    		showHeading,
    		showLabels,
    		dataSpacing,
    		hideData,
    		showDataAxis,
    		showDataOnHover,
    		legendInline,
    		legendType,
    		showTooltips,
    		resolveDataTooltip,
    		reverse,
    		stacked,
    		classes,
    		color,
    		resolveDataColor,
    		$$scope,
    		slots
    	];
    }

    class SvelteChartCss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				type: 11,
    				heading: 0,
    				headingSize: 12,
    				showHeading: 13,
    				labels: 1,
    				showLabels: 14,
    				dataSpacing: 15,
    				hideData: 16,
    				showDataAxis: 17,
    				showDataOnHover: 18,
    				datasets: 2,
    				showLegend: 3,
    				legendInline: 19,
    				legendType: 20,
    				showTooltips: 21,
    				resolveDataTooltip: 22,
    				reverse: 23,
    				stacked: 24,
    				classes: 25,
    				color: 26,
    				formatDataValue: 4,
    				resolveDataColor: 27
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteChartCss",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[11] === undefined && !('type' in props)) {
    			console.warn("<SvelteChartCss> was created without expected prop 'type'");
    		}

    		if (/*labels*/ ctx[1] === undefined && !('labels' in props)) {
    			console.warn("<SvelteChartCss> was created without expected prop 'labels'");
    		}

    		if (/*datasets*/ ctx[2] === undefined && !('datasets' in props)) {
    			console.warn("<SvelteChartCss> was created without expected prop 'datasets'");
    		}
    	}

    	get type() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get heading() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set heading(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get headingSize() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set headingSize(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showHeading() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showHeading(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labels() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labels(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showLabels() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showLabels(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dataSpacing() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dataSpacing(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hideData() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hideData(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showDataAxis() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showDataAxis(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showDataOnHover() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showDataOnHover(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get datasets() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datasets(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showLegend() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showLegend(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legendInline() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legendInline(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legendType() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legendType(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showTooltips() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showTooltips(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get resolveDataTooltip() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resolveDataTooltip(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reverse() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reverse(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stacked() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stacked(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get classes() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set classes(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatDataValue() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatDataValue(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get resolveDataColor() {
    		throw new Error("<SvelteChartCss>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resolveDataColor(value) {
    		throw new Error("<SvelteChartCss>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    return SvelteChartCss;

}));
