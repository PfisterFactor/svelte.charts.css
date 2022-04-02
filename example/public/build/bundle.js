
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function create_component(block) {
        block && block.c();
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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
    const file$1 = "src/SvelteChartCss.svelte";

    function get_each_context$1(ctx, list, i) {
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
    			add_location(caption, file$1, 140, 12, 4571);
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
    			add_location(span, file$1, 161, 28, 5480);
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
    			add_location(span, file$1, 155, 24, 5140);
    			attr_dev(td, "style", td_style_value = /*resolveDataStyle*/ ctx[9](/*value*/ ctx[38], /*rowIndex*/ ctx[37], /*colIndex*/ ctx[40]));
    			add_location(td, file$1, 154, 20, 5055);
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
    			add_location(th, file$1, 149, 16, 4821);
    			add_location(tr, file$1, 148, 12, 4800);
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
    function create_each_block$1(key_1, ctx) {
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
    			add_location(li, file$1, 179, 12, 5997);
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
    		id: create_each_block$1.name,
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
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", /*legendClasses*/ ctx[8]);
    			add_location(ul, file$1, 177, 8, 5878);
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
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block$1, null, get_each_context$1);
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

    function create_fragment$1(ctx) {
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
    			add_location(tbody, file$1, 146, 8, 4727);
    			attr_dev(table, "class", /*chartClasses*/ ctx[5]);
    			add_location(table, file$1, 136, 4, 4465);
    			attr_dev(div, "class", "svelte-charts-css");
    			attr_dev(div, "style", /*style*/ ctx[6]);
    			add_location(div, file$1, 135, 0, 4413);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    			instance$1,
    			create_fragment$1,
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
    			id: create_fragment$1.name
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

    var SvelteChartCss$1 = SvelteChartCss;

    /* example/src/App.svelte generated by Svelte v3.46.6 */
    const file = "example/src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    // (169:2) {#each types as availableType,index (availableType)}
    function create_each_block(key_1, ctx) {
    	let button;
    	let t0_value = /*availableType*/ ctx[31] + "";
    	let t0;
    	let t1;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[24](/*availableType*/ ctx[31]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			button.disabled = button_disabled_value = /*type*/ ctx[2] === /*availableType*/ ctx[31];
    			add_location(button, file, 169, 2, 5063);
    			this.first = button;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*type*/ 4 && button_disabled_value !== (button_disabled_value = /*type*/ ctx[2] === /*availableType*/ ctx[31])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(169:2) {#each types as availableType,index (availableType)}",
    		ctx
    	});

    	return block;
    }

    // (194:2) 
    function create_heading_slot(ctx) {
    	let div;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file, 194, 3, 5501);
    			attr_dev(div, "slot", "heading");
    			add_location(div, file, 193, 2, 5475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*heading*/ ctx[3]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[27]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*heading*/ 8 && input.value !== /*heading*/ ctx[3]) {
    				set_input_value(input, /*heading*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_heading_slot.name,
    		type: "slot",
    		source: "(194:2) ",
    		ctx
    	});

    	return block;
    }

    // (198:2) 
    function create_label_slot(ctx) {
    	let div;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	function input_handler_1(...args) {
    		return /*input_handler_1*/ ctx[26](/*labelIndex*/ ctx[30], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "class", "label");
    			attr_dev(input, "type", "text");
    			input.value = input_value_value = /*label*/ ctx[29];
    			set_style(input, "width", /*label*/ ctx[29].length + 6 + "ch");
    			add_location(input, file, 198, 3, 5603);
    			attr_dev(div, "slot", "label");
    			add_location(div, file, 197, 2, 5554);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*label*/ 536870912 && input_value_value !== (input_value_value = /*label*/ ctx[29]) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*label*/ 536870912) {
    				set_style(input, "width", /*label*/ ctx[29].length + 6 + "ch");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_label_slot.name,
    		type: "slot",
    		source: "(198:2) ",
    		ctx
    	});

    	return block;
    }

    // (208:2) 
    function create_data_slot(ctx) {
    	let div;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[25](/*value*/ ctx[28], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "class", "data-number");
    			attr_dev(input, "type", "number");
    			input.value = input_value_value = /*value*/ ctx[28].valueRaw;
    			attr_dev(input, "min", "1");
    			add_location(input, file, 208, 3, 5814);
    			attr_dev(div, "slot", "data");
    			add_location(div, file, 207, 2, 5781);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*value*/ 268435456 && input_value_value !== (input_value_value = /*value*/ ctx[28].valueRaw) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_data_slot.name,
    		type: "slot",
    		source: "(208:2) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div11;
    	let h1;
    	let a;
    	let t1;
    	let t2;
    	let div7;
    	let div0;
    	let input0;
    	let t3;
    	let label0;
    	let t5;
    	let div1;
    	let input1;
    	let t6;
    	let label1;
    	let t8;
    	let div2;
    	let input2;
    	let t9;
    	let label2;
    	let t11;
    	let div3;
    	let input3;
    	let t12;
    	let label3;
    	let t14;
    	let div4;
    	let input4;
    	let t15;
    	let label4;
    	let t17;
    	let div5;
    	let input5;
    	let t18;
    	let label5;
    	let t20;
    	let div6;
    	let input6;
    	let t21;
    	let label6;
    	let t23;
    	let div8;
    	let button0;
    	let t25;
    	let button1;
    	let t27;
    	let button2;
    	let t29;
    	let h2;
    	let t30;
    	let t31;
    	let t32;
    	let div9;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t33;
    	let br;
    	let t34;
    	let sveltechartcss;
    	let t35;
    	let div10;
    	let textarea;
    	let textarea_rows_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*types*/ ctx[11];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*availableType*/ ctx[31];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	sveltechartcss = new SvelteChartCss$1({
    			props: {
    				type: /*type*/ ctx[2],
    				heading: /*heading*/ ctx[3],
    				labels: /*labels*/ ctx[0],
    				datasets: /*datasets*/ ctx[1],
    				dataSpacing: /*dataSpacing*/ ctx[4],
    				showHeading: /*showHeading*/ ctx[5],
    				showLegend: /*showLegend*/ ctx[6],
    				showLabels: /*showLabels*/ ctx[7],
    				showTooltips: /*showTooltips*/ ctx[8],
    				reverse: /*reverse*/ ctx[9],
    				$$slots: {
    					data: [
    						create_data_slot,
    						({ value }) => ({ 28: value }),
    						({ value }) => [value ? 268435456 : 0]
    					],
    					label: [
    						create_label_slot,
    						({ label, labelIndex }) => ({ 29: label, 30: labelIndex }),
    						({ label, labelIndex }) => [(label ? 536870912 : 0) | (labelIndex ? 1073741824 : 0)]
    					],
    					heading: [create_heading_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			h1 = element("h1");
    			a = element("a");
    			a.textContent = "Svelte Charts.CSS";
    			t1 = text(" Playground");
    			t2 = space();
    			div7 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t3 = space();
    			label0 = element("label");
    			label0.textContent = "show-heading";
    			t5 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t6 = space();
    			label1 = element("label");
    			label1.textContent = "show-legend";
    			t8 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t9 = space();
    			label2 = element("label");
    			label2.textContent = "show-labels";
    			t11 = space();
    			div3 = element("div");
    			input3 = element("input");
    			t12 = space();
    			label3 = element("label");
    			label3.textContent = "show-tooltips";
    			t14 = space();
    			div4 = element("div");
    			input4 = element("input");
    			t15 = space();
    			label4 = element("label");
    			label4.textContent = "reverse";
    			t17 = space();
    			div5 = element("div");
    			input5 = element("input");
    			t18 = space();
    			label5 = element("label");
    			label5.textContent = "data-spacing";
    			t20 = space();
    			div6 = element("div");
    			input6 = element("input");
    			t21 = space();
    			label6 = element("label");
    			label6.textContent = "heading";
    			t23 = space();
    			div8 = element("div");
    			button0 = element("button");
    			button0.textContent = "Add Dataset";
    			t25 = space();
    			button1 = element("button");
    			button1.textContent = "Remove Dataset";
    			t27 = space();
    			button2 = element("button");
    			button2.textContent = "Randomize Datasets";
    			t29 = space();
    			h2 = element("h2");
    			t30 = text(/*type*/ ctx[2]);
    			t31 = text(" Chart");
    			t32 = space();
    			div9 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t33 = space();
    			br = element("br");
    			t34 = space();
    			create_component(sveltechartcss.$$.fragment);
    			t35 = space();
    			div10 = element("div");
    			textarea = element("textarea");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", "https://github.com/PfisterFactor/svelte.charts.css");
    			add_location(a, file, 125, 2, 3636);
    			add_location(h1, file, 124, 1, 3629);
    			attr_dev(input0, "id", "showHeading");
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file, 130, 3, 3788);
    			attr_dev(label0, "for", "showHeading");
    			add_location(label0, file, 131, 3, 3861);
    			add_location(div0, file, 129, 2, 3779);
    			attr_dev(input1, "id", "showLegend");
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file, 134, 3, 3927);
    			attr_dev(label1, "for", "showLegend");
    			add_location(label1, file, 135, 3, 3998);
    			add_location(div1, file, 133, 2, 3918);
    			attr_dev(input2, "id", "showLabels");
    			attr_dev(input2, "type", "checkbox");
    			add_location(input2, file, 138, 3, 4062);
    			attr_dev(label2, "for", "showLabels");
    			add_location(label2, file, 139, 3, 4133);
    			add_location(div2, file, 137, 2, 4053);
    			attr_dev(input3, "id", "showTooltips");
    			attr_dev(input3, "type", "checkbox");
    			add_location(input3, file, 142, 3, 4197);
    			attr_dev(label3, "for", "showTooltips");
    			add_location(label3, file, 143, 3, 4272);
    			add_location(div3, file, 141, 2, 4188);
    			attr_dev(input4, "id", "reverse");
    			attr_dev(input4, "type", "checkbox");
    			add_location(input4, file, 146, 3, 4340);
    			attr_dev(label4, "for", "reverse");
    			add_location(label4, file, 147, 3, 4405);
    			add_location(div4, file, 145, 2, 4331);
    			attr_dev(input5, "id", "dataSpacing");
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "min", "0");
    			attr_dev(input5, "max", "20");
    			add_location(input5, file, 150, 3, 4462);
    			attr_dev(label5, "for", "dataSpacing");
    			add_location(label5, file, 151, 3, 4548);
    			add_location(div5, file, 149, 2, 4453);
    			attr_dev(input6, "id", "heading");
    			attr_dev(input6, "type", "text");
    			add_location(input6, file, 154, 3, 4614);
    			attr_dev(label6, "for", "heading");
    			add_location(label6, file, 155, 3, 4675);
    			add_location(div6, file, 153, 2, 4605);
    			attr_dev(div7, "class", "options");
    			add_location(div7, file, 128, 1, 3755);
    			add_location(button0, file, 160, 2, 4763);
    			add_location(button1, file, 161, 2, 4816);
    			add_location(button2, file, 162, 2, 4875);
    			attr_dev(div8, "class", "buttons-wrapper");
    			add_location(div8, file, 159, 1, 4731);
    			add_location(h2, file, 165, 1, 4950);
    			attr_dev(div9, "class", "buttons-wrapper");
    			add_location(div9, file, 167, 1, 4976);
    			add_location(br, file, 179, 1, 5204);
    			textarea.value = /*stringifiedDatasetsAndLabels*/ ctx[10];
    			attr_dev(textarea, "rows", textarea_rows_value = /*stringifiedDatasetsAndLabels*/ ctx[10].split('\n').length);
    			textarea.readOnly = true;
    			add_location(textarea, file, 219, 2, 6077);
    			set_style(div10, "width", "100%");
    			set_style(div10, "display", "flex");
    			add_location(div10, file, 218, 1, 6033);
    			add_location(div11, file, 123, 0, 3622);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, h1);
    			append_dev(h1, a);
    			append_dev(h1, t1);
    			append_dev(div11, t2);
    			append_dev(div11, div7);
    			append_dev(div7, div0);
    			append_dev(div0, input0);
    			input0.checked = /*showHeading*/ ctx[5];
    			append_dev(div0, t3);
    			append_dev(div0, label0);
    			append_dev(div7, t5);
    			append_dev(div7, div1);
    			append_dev(div1, input1);
    			input1.checked = /*showLegend*/ ctx[6];
    			append_dev(div1, t6);
    			append_dev(div1, label1);
    			append_dev(div7, t8);
    			append_dev(div7, div2);
    			append_dev(div2, input2);
    			input2.checked = /*showLabels*/ ctx[7];
    			append_dev(div2, t9);
    			append_dev(div2, label2);
    			append_dev(div7, t11);
    			append_dev(div7, div3);
    			append_dev(div3, input3);
    			input3.checked = /*showTooltips*/ ctx[8];
    			append_dev(div3, t12);
    			append_dev(div3, label3);
    			append_dev(div7, t14);
    			append_dev(div7, div4);
    			append_dev(div4, input4);
    			input4.checked = /*reverse*/ ctx[9];
    			append_dev(div4, t15);
    			append_dev(div4, label4);
    			append_dev(div7, t17);
    			append_dev(div7, div5);
    			append_dev(div5, input5);
    			set_input_value(input5, /*dataSpacing*/ ctx[4]);
    			append_dev(div5, t18);
    			append_dev(div5, label5);
    			append_dev(div7, t20);
    			append_dev(div7, div6);
    			append_dev(div6, input6);
    			set_input_value(input6, /*heading*/ ctx[3]);
    			append_dev(div6, t21);
    			append_dev(div6, label6);
    			append_dev(div11, t23);
    			append_dev(div11, div8);
    			append_dev(div8, button0);
    			append_dev(div8, t25);
    			append_dev(div8, button1);
    			append_dev(div8, t27);
    			append_dev(div8, button2);
    			append_dev(div11, t29);
    			append_dev(div11, h2);
    			append_dev(h2, t30);
    			append_dev(h2, t31);
    			append_dev(div11, t32);
    			append_dev(div11, div9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div9, null);
    			}

    			append_dev(div11, t33);
    			append_dev(div11, br);
    			append_dev(div11, t34);
    			mount_component(sveltechartcss, div11, null);
    			append_dev(div11, t35);
    			append_dev(div11, div10);
    			append_dev(div10, textarea);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[17]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[18]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[19]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[20]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[21]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[22]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[23]),
    					listen_dev(button0, "click", /*addDataset*/ ctx[14], false, false, false),
    					listen_dev(button1, "click", /*removeDataset*/ ctx[15], false, false, false),
    					listen_dev(button2, "click", /*randomizeDatasets*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*showHeading*/ 32) {
    				input0.checked = /*showHeading*/ ctx[5];
    			}

    			if (dirty[0] & /*showLegend*/ 64) {
    				input1.checked = /*showLegend*/ ctx[6];
    			}

    			if (dirty[0] & /*showLabels*/ 128) {
    				input2.checked = /*showLabels*/ ctx[7];
    			}

    			if (dirty[0] & /*showTooltips*/ 256) {
    				input3.checked = /*showTooltips*/ ctx[8];
    			}

    			if (dirty[0] & /*reverse*/ 512) {
    				input4.checked = /*reverse*/ ctx[9];
    			}

    			if (dirty[0] & /*dataSpacing*/ 16 && to_number(input5.value) !== /*dataSpacing*/ ctx[4]) {
    				set_input_value(input5, /*dataSpacing*/ ctx[4]);
    			}

    			if (dirty[0] & /*heading*/ 8 && input6.value !== /*heading*/ ctx[3]) {
    				set_input_value(input6, /*heading*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*type*/ 4) set_data_dev(t30, /*type*/ ctx[2]);

    			if (dirty[0] & /*type, types*/ 2052) {
    				each_value = /*types*/ ctx[11];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div9, destroy_block, create_each_block, null, get_each_context);
    			}

    			const sveltechartcss_changes = {};
    			if (dirty[0] & /*type*/ 4) sveltechartcss_changes.type = /*type*/ ctx[2];
    			if (dirty[0] & /*heading*/ 8) sveltechartcss_changes.heading = /*heading*/ ctx[3];
    			if (dirty[0] & /*labels*/ 1) sveltechartcss_changes.labels = /*labels*/ ctx[0];
    			if (dirty[0] & /*datasets*/ 2) sveltechartcss_changes.datasets = /*datasets*/ ctx[1];
    			if (dirty[0] & /*dataSpacing*/ 16) sveltechartcss_changes.dataSpacing = /*dataSpacing*/ ctx[4];
    			if (dirty[0] & /*showHeading*/ 32) sveltechartcss_changes.showHeading = /*showHeading*/ ctx[5];
    			if (dirty[0] & /*showLegend*/ 64) sveltechartcss_changes.showLegend = /*showLegend*/ ctx[6];
    			if (dirty[0] & /*showLabels*/ 128) sveltechartcss_changes.showLabels = /*showLabels*/ ctx[7];
    			if (dirty[0] & /*showTooltips*/ 256) sveltechartcss_changes.showTooltips = /*showTooltips*/ ctx[8];
    			if (dirty[0] & /*reverse*/ 512) sveltechartcss_changes.reverse = /*reverse*/ ctx[9];

    			if (dirty[0] & /*value, label, heading*/ 805306376 | dirty[1] & /*$$scope*/ 8) {
    				sveltechartcss_changes.$$scope = { dirty, ctx };
    			}

    			sveltechartcss.$set(sveltechartcss_changes);

    			if (!current || dirty[0] & /*stringifiedDatasetsAndLabels*/ 1024) {
    				prop_dev(textarea, "value", /*stringifiedDatasetsAndLabels*/ ctx[10]);
    			}

    			if (!current || dirty[0] & /*stringifiedDatasetsAndLabels*/ 1024 && textarea_rows_value !== (textarea_rows_value = /*stringifiedDatasetsAndLabels*/ ctx[10].split('\n').length)) {
    				attr_dev(textarea, "rows", textarea_rows_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sveltechartcss.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sveltechartcss.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			destroy_component(sveltechartcss);
    			mounted = false;
    			run_all(dispose);
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

    function generateName() {
    	const randomNames = [
    		"Genaro",
    		"Zandra",
    		"Nancey",
    		"Jeannette",
    		"Michel",
    		"Kacey",
    		"Essie",
    		"Kristi",
    		"Manuel",
    		"Cherrie",
    		"Dollie",
    		"Jordon",
    		"Cathie",
    		"Latoyia",
    		"Herlinda"
    	];

    	return randomNames[Math.floor(Math.random() * randomNames.length)];
    }

    /**
     * Returns a random number between 1 and 100.
     * @return {number}
     */
    function generateNumber() {
    	return Math.max(1, Math.round(Math.random() * 100));
    }

    function instance($$self, $$props, $$invalidate) {
    	let stringifiedDatasetsAndLabels;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let types = ['column', 'bar', 'line', 'area'];
    	let type = "column";
    	let heading = "Team's coffee count";
    	let dataSpacing = 20;
    	let showHeading = true;
    	let showLegend = true;
    	let showLabels = true;
    	let showTooltips = false;
    	let reverse = false;
    	let labels = ["Mon", "Tue", "Wed"];
    	let datasets = [];

    	/**
                 * Allow the user to update the label at the given index.
                 * @param labelIndex
                 * @param newValue
                 */
    	function updateLabel(labelIndex, newValue) {
    		$$invalidate(0, labels[labelIndex] = newValue, labels);
    	}

    	/**
     * Allow the user to update the dataset value at the given index.
     * @param datasetIndex
     * @param valueIndex
     * @param newValue
     */
    	function updateDatasetValue(datasetIndex, valueIndex, newValue) {
    		let dataset = datasets[datasetIndex];
    		dataset.values[valueIndex] = newValue;
    		$$invalidate(1, datasets[datasetIndex] = dataset, datasets);
    	}

    	/**
     * Add a new generated dataset to the chart.
     */
    	function addDataset() {
    		datasets.push({
    			name: generateName(),
    			values: [generateNumber(), generateNumber(), generateNumber()]
    		});

    		$$invalidate(1, datasets);
    	}

    	/**
     * Remove a dataset from the chart.
     */
    	function removeDataset() {
    		$$invalidate(1, datasets = datasets.slice(1));
    	}

    	/**
     * Randomizes the values of every dataset.
     */
    	function randomizeDatasets() {
    		for (let datasetIndex = 0; datasetIndex < datasets.length; datasetIndex++) {
    			let dataset = datasets[datasetIndex];
    			dataset.values = dataset.values.map(value => generateNumber());
    			$$invalidate(1, datasets[datasetIndex] = dataset, datasets);
    		}
    	}
    	addDataset();
    	addDataset();
    	addDataset();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		showHeading = this.checked;
    		$$invalidate(5, showHeading);
    	}

    	function input1_change_handler() {
    		showLegend = this.checked;
    		$$invalidate(6, showLegend);
    	}

    	function input2_change_handler() {
    		showLabels = this.checked;
    		$$invalidate(7, showLabels);
    	}

    	function input3_change_handler() {
    		showTooltips = this.checked;
    		$$invalidate(8, showTooltips);
    	}

    	function input4_change_handler() {
    		reverse = this.checked;
    		$$invalidate(9, reverse);
    	}

    	function input5_input_handler() {
    		dataSpacing = to_number(this.value);
    		$$invalidate(4, dataSpacing);
    	}

    	function input6_input_handler() {
    		heading = this.value;
    		$$invalidate(3, heading);
    	}

    	const click_handler = availableType => $$invalidate(2, type = availableType);
    	const input_handler = (value, e) => updateDatasetValue(value.datasetIndex, value.valueIndex, e.target.value);
    	const input_handler_1 = (labelIndex, e) => updateLabel(labelIndex, e.target.value);

    	function input_input_handler() {
    		heading = this.value;
    		$$invalidate(3, heading);
    	}

    	$$self.$capture_state = () => ({
    		SvelteChartCss: SvelteChartCss$1,
    		types,
    		type,
    		heading,
    		dataSpacing,
    		showHeading,
    		showLegend,
    		showLabels,
    		showTooltips,
    		reverse,
    		labels,
    		datasets,
    		updateLabel,
    		updateDatasetValue,
    		addDataset,
    		removeDataset,
    		randomizeDatasets,
    		generateName,
    		generateNumber,
    		stringifiedDatasetsAndLabels
    	});

    	$$self.$inject_state = $$props => {
    		if ('types' in $$props) $$invalidate(11, types = $$props.types);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    		if ('heading' in $$props) $$invalidate(3, heading = $$props.heading);
    		if ('dataSpacing' in $$props) $$invalidate(4, dataSpacing = $$props.dataSpacing);
    		if ('showHeading' in $$props) $$invalidate(5, showHeading = $$props.showHeading);
    		if ('showLegend' in $$props) $$invalidate(6, showLegend = $$props.showLegend);
    		if ('showLabels' in $$props) $$invalidate(7, showLabels = $$props.showLabels);
    		if ('showTooltips' in $$props) $$invalidate(8, showTooltips = $$props.showTooltips);
    		if ('reverse' in $$props) $$invalidate(9, reverse = $$props.reverse);
    		if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
    		if ('datasets' in $$props) $$invalidate(1, datasets = $$props.datasets);
    		if ('stringifiedDatasetsAndLabels' in $$props) $$invalidate(10, stringifiedDatasetsAndLabels = $$props.stringifiedDatasetsAndLabels);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*datasets, labels*/ 3) {
    			/**
     * Used to demonstrate a JSON stringified version of the datasets and labels.
     * @return {string}
     */
    			$$invalidate(10, stringifiedDatasetsAndLabels = (function () {
    				const value = { datasets, labels };
    				return JSON.stringify(value, null, 4);
    			})());
    		}
    	};

    	return [
    		labels,
    		datasets,
    		type,
    		heading,
    		dataSpacing,
    		showHeading,
    		showLegend,
    		showLabels,
    		showTooltips,
    		reverse,
    		stringifiedDatasetsAndLabels,
    		types,
    		updateLabel,
    		updateDatasetValue,
    		addDataset,
    		removeDataset,
    		randomizeDatasets,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler,
    		input5_input_handler,
    		input6_input_handler,
    		click_handler,
    		input_handler,
    		input_handler_1,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var App$1 = App;

    const app = new App$1({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
