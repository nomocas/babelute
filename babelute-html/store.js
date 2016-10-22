/**
 * Create store
 * @param  {Object} initialState 
 * @return {Store}  a store instance
 */
function createStore(initialState) {
	var _state = initialState || {},
		_listeners = [];

	function updateListeners(state) {
		_listeners.forEach(function(listener) {
			listener.cb(state);
		});
	}
	return {
		setState: function(state) {
			_state = state;
			updateListeners(state);
		},
		getState: function() {
			return _state;
		},
		onUpdate: function(name, cb) {
			_listeners.push({
				name: name,
				cb: cb
			});
		}
	};
}