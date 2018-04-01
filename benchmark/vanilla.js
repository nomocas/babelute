/*
 * @Author: Gilles Coomans
 * @Date:   2017-05-30 15:26:06
 * @Last Modified by:   Gilles Coomans
 * @Last Modified time: 2017-06-03 13:15:39
 */

'use strict';


function mapAttributes(data, fields) {
	const attr = {};
	fields.forEach(field => attr[field] = data[field]);
	return attr;
}

function constanteVanilla() {
	return {
		meta: {
			'total-pages': 13
		},
		data: [{
			id: 'foo1',
			type: 'foo',
			attributes: {
				title: 'hello'
			}
		}, {
			id: 'foo2',
			type: 'foo',
			attributes: {
				title: 'world'
			}
		}],
		links: {
			self: 'http://foo.com/bar/..../3'
		}
	};
}

function immediateObjectVanilla(model, data, query, pageInfos) {
	return {
		meta: {
			"total-pages": pageInfos.totalPages
		},
		data: data.map(item => ({
			id: item.id,
			type: model.name,
			attributes: mapAttributes(data, query.fields)
		})),
		links: {
			self: `http://foo.com/bar/..../${ pageInfos.self }`
		}
	};
}


function vanillaByStep(model, data, query, pageInfos) {
	var res = {};
	res.meta = { "total-pages": pageInfos.totalPages };
	res.data = [];
	data.forEach(item => res.data.push({
		id: item.id,
		type: model.name,
		attributes: mapAttributes(data, query.fields)
	}));
	res.links = {
		self: "http://foo.com/bar/..../" + pageInfos.self
	};
	return res;
}


const functionalSplittedVanilla = {
	pageLinks(subject, model, data, query, pageInfos) {
		subject.links = {
			self: `http://foo.com/bar/..../${ pageInfos.self }`
		};
	},
	pageMeta(subject, model, data, query, pageInfos) {
		subject.meta = {
			'total-pages': pageInfos.totalPages
		};
	},
	pageData(subject, model, data, query) {
		subject.data = [];
		data.forEach(item => this.dataItem(subject.data, model, item, query));
	},
	dataItem(subject, model, data, query) {
		subject.push({
			id: data.id,
			type: model.name,
			attributes: mapAttributes(data, query.fields)
		});
	},
	page(subject, model, data, query, pageInfos) {
		this.pageMeta(subject, model, data, query, pageInfos)
		this.pageData(subject, model, data, query)
		this.pageLinks(subject, model, data, query, pageInfos);
	}
};

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const functionalPipedVanilla = {
	pageLinks(model, data, query, pageInfos) {
		return (subject) => {
			subject.links = {
				self: `http://foo.com/bar/..../${ pageInfos.self }`
			};
			return subject;
		};
	},
	pageMeta(model, data, query, pageInfos) {
		return (subject) => {
			subject.meta = {
				'total-pages': pageInfos.totalPages
			};
			return subject;
		};
	},
	pageData(model, data, query) {
		return (subject) => {
			subject.data = [];
			data.forEach(item => this.dataItem(model, item, query)(subject.data));
			return subject;
		};
	},
	dataItem(model, data, query) {
		return (subject) => {
			subject.push({
				id: data.id,
				type: model.name,
				attributes: mapAttributes(data, query.fields)
			});
			return subject;
		};
	},
	page(model, data, query, pageInfos) {
		return pipe(
			this.pageMeta(model, data, query, pageInfos),
			this.pageData(model, data, query),
			this.pageLinks(model, data, query, pageInfos)
		);
	}
};

export {
	constanteVanilla,
	immediateObjectVanilla,
	vanillaByStep,
	functionalSplittedVanilla,
	functionalPipedVanilla
};

