/*
 * @Author: Gilles Coomans
 * @Date:   2017-05-27 00:38:04
 * @Last Modified by:   Gilles Coomans
 * @Last Modified time: 2017-06-03 13:16:20
 */

import {
	createFacadePragmatics
}
from '../src/pragmatics/new-pragmas';
import assert from 'assert';


const jsonPragmatics = createFacadePragmatics({ json: true })
	.addPragmas({
		value(parent, name, value) {
			if (arguments.length < 3) {
				value = name;
				name = null;
			}
			assert(name || Array.isArray(parent), '.value() without name should be used with an array as parent');
			name ? (parent[name] = value) : parent.push(value);
		},
		array(parent, name, value) {
			if (arguments.length < 3) {
				value = name;
				name = null;
			}
			assert(name || Array.isArray(parent), '.array() without name should be used with an array as parent');
			value = (value && value.__babelute__) ? this.$output(value, []) : (typeof value === 'undefined' ? [] : value);
			name ? (parent[name] = value) : parent.push(value);
		},
		object(parent, name, value) {
			if (arguments.length < 3) {
				value = name;
				name = null;
			}
			assert(name || Array.isArray(parent), '.object() without name should be used with an array as parent');
			value = (value && value.__babelute__) ? this.$output(value, {}) : (typeof value === 'undefined' ? {} : value);
			name ? (parent[name] = value) : parent.push(value);
		},
		done(parent, handler) {
			handler(parent);
		}
	});

function mapAttributes(data, fields) {
	const attr = {};
	fields.forEach(field => attr[field] = data[field]);
	return attr;
}

const jsonapiPragmatics = jsonPragmatics
	.createDialect()
	.addPragmas(p => ({
		pageLinks(parent, model, data, query, pageInfos) {
			parent.links = {
				self: `http://foo.com/bar/..../${ pageInfos.self }`
			};
		},
		pageMeta(parent, model, data, query, pageInfos) {
			parent.meta = {
				'total-pages': pageInfos.totalPages
			};
		},
		pageData(parent, model, data, query) {
			parent.data = [];
			// data.forEach(item => this.dataItem(parent.data, model, item, query)); // use initializer
			data.forEach(item => p(parent.data).dataItem(model, item, query)); // use initializer
			// p(parent.data = []).each(data, (subject, item) => this.dataItem(subject, model, item, query));
		},
		dataItem(parent, model, data, query) {
			parent.push({
				id: data.id,
				type: model.name,
				attributes: mapAttributes(data, query.fields)
			});
		},
		page(parent, model, data, query, pageInfos) {
			p(parent) // use initializer
				.pageMeta(model, data, query, pageInfos)
				.pageData(model, data, query)
				.pageLinks(model, data, query, pageInfos);
		}
	}));



export default jsonapiPragmatics;

