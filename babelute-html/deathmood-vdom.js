/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 * 
 * Simple virtual dom diffing (finally quite fast) : Based on :
 * https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060#.baku8vbw8
 * and
 * https://medium.com/@deathmood/write-your-virtual-dom-2-props-events-a957608f5c76#.6sqmdjuvz
 *
 * Added : 
 * => DocFragment management (aka vnode = { type:'fragment', children:[...], props:{} }) (e.g useful for component)
 *
 * Main code change : 
 * => store dom node's ref in associated vnode, no more use of child index
 * => better events listener management (always remove olds + add news)
 *
 * @usage
 * 		const deathmood = require('deathmood-vdom'),
 * 			h = deathmood.createVNode;
 *
 * 		function render(){
 * 			return h('fragment', null, [
 * 					h('div', 
 * 						{ className:'foo', id:'bar', myAttr:'zoo' }, // attributes
 * 						[ // children
 * 							h('span', null, ['hello world'])
 * 						],
 * 						[ // events
 * 							{ 
 * 								name:'click', 
 * 								callback:function(e){ ... }
 * 							}
 * 						]
 * 					),
 * 					h('section', ...)
 * 					...
 * 				]);
 * 		}
 * 		
 *  	// ...
 *  	var oldVNode;
 *	  	//...
 *	  	var newVNode = render();
 *	  	deathmood.update(document.body, newVNode, oldVNode);
 *	  	oldVNode = newVNode;
 */

function createElement($parent, vnode) {
	if (typeof vnode.text !== 'undefined')
		return vnode.node = document.createTextNode(vnode.text); // store text-node in vnode
	var $el;
	if (vnode.type === 'fragment') {
		vnode.parent = $parent; // store parent in vnode, keep $parent as recursion parent
		$el = document.createDocumentFragment();
	} else { // is a tag
		$parent = vnode.node = $el = document.createElement(vnode.type); // store dom-node in vnode, set recursion parent as produced node
		setLocals($el, vnode); // set props and listeners
	}
	for (var i = 0, len = vnode.children.length; i < len; ++i) // recursion on vnode children
		$el.appendChild(createElement($parent, vnode.children[i]));
	return $el; // DocumentFragment or DomNode
}

function update($parent, newNode, oldNode) {
	if (!oldNode)
		$parent.appendChild(createElement($parent, newNode));

	else if (!newNode)
		removeElement(oldNode); // remove fragment or node

	else if (changed(newNode, oldNode)) {
		// (vnode type or text value) has changed
		$parent.insertBefore(createElement($parent, newNode), firstElement(oldNode));
		removeElement(oldNode); // remove fragment or node

	} else if (newNode.type) // is not a text node, no type change
		updateElement(newNode, oldNode);

	else // is a text node
		newNode.node = oldNode.node; // forward node to new vnode
}

function updateElement(newNode, oldNode) {
	var subParent;
	if (newNode.type !== 'fragment') { // is a tag
		// update props and listeners
		updateLocals(oldNode.node, newNode, oldNode);
		// forward node to new vdom, set subparent as tag's node (so normal recursion)
		subParent = newNode.node = oldNode.node;
	} else // is fragment : forward parent in new vnode, set subParent as $parent (transparent recursion)
		subParent = newNode.parent = oldNode.parent;

	const len = Math.max(newNode.children.length, oldNode.children.length);
	for (var i = 0; i < len; i++)
		update(subParent, newNode.children[i], oldNode.children[i]);
}

function updateLocals($target, newNode, oldNode) {
	var props = assign({}, newNode.props, oldNode.props);
	for (var i in props)
		updateProp($target, i, newNode.props[i], oldNode.props[i]);
	// remove all olds and add all news events listener : not really performance oriented 
	// but do the job for multiple events handler with same name (aka click)
	if (oldNode.on)
		oldNode.on.forEach(function(event) {
			$target.removeEventListener(event.name, event.callback);
		});
	if (newNode.on)
		newNode.on.forEach(function(event) {
			$target.addEventListener(event.name, event.callback);
		});
}

function setLocals($target, node) {
	for (var i in node.props)
		setProp($target, i, node.props[i]);
	if (node.on)
		for (var i = 0, len = node.on.length; i < len; ++i)
			$target.addEventListener(node.on[i].name, node.on[i].callback);
}

function removeElement(vnode) {
	if (vnode.type !== 'fragment')
		vnode.node.parentNode.removeChild(vnode.node);
	else
		for (var i = 0, len = vnode.children.length; i < len; ++i)
			removeElement(vnode.children[i]);
}

function firstElement(vnode) {
	if (vnode.type !== 'fragment')
		return vnode.node;
	return firstElement(vnode.children[0]);
}

function changed(node1, node2) {
	return node1.type !== node2.type || node1.text !== node2.text;
}

function setProp($target, name, value) {
	if (name === 'className')
		$target.setAttribute('class', value);
	else if (typeof value === 'boolean')
		setBooleanProp($target, name, value);
	else
		$target.setAttribute(name, value);
}

function setBooleanProp($target, name, value) {
	if (value) {
		$target.setAttribute(name, value);
		$target[name] = true;
	} else
		$target[name] = false;
}

function removeBooleanProp($target, name) {
	$target.removeAttribute(name);
	$target[name] = false;
}

function removeProp($target, name, value) {
	if (name === 'className')
		$target.removeAttribute('class');
	else if (typeof value === 'boolean')
		removeBooleanProp($target, name);
	else
		$target.removeAttribute(name);
}

function updateProp($target, name, newVal, oldVal) {
	if (!newVal)
		removeProp($target, name, oldVal);
	else if (!oldVal || newVal !== oldVal)
		setProp($target, name, newVal);
}

// Object.assign immitation (only for 1 or 2 arguments as needed here)
function assign($root, obj, obj2) {
	for (var i in obj)
		$root[i] = obj[i];
	for (var i in obj2)
		$root[i] = obj2[i];
	return $root;
}

module.exports = {
	createVNode: function(type, props, children, events) {
		return {
			type: type,
			props: props || {},
			children: children || [],
			on: events || null
		};
	},
	update: update,
	firstElement: firstElement
};