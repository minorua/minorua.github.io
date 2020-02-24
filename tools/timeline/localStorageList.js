// localStorageList
// 2012/02/04

var localStorageList = function(prefix) {
	this.prefix = prefix;
}

localStorageList.prototype.count = function () {
	itemCount = localStorage[this.prefix+'itemcount'];
	if(typeof itemCount == 'undefined') return 0;
	return parseInt(itemCount);
};

localStorageList.prototype.addString = function (str) {
	index = this.count();
	localStorage[this.prefix+index] = str;
	localStorage[this.prefix+'itemcount'] = ++index;
};

localStorageList.prototype.getString = function (index) {
	return localStorage[this.prefix+index];
};

localStorageList.prototype.setString = function (index,str) {
	if(index < 0 || this.count() <= index) return false;
	localStorage[this.prefix+index] = str;
};

localStorageList.prototype.add  = function (obj) {
	return this.addString(JSON.stringify(obj));
};

localStorageList.prototype.get = function (index) {
	str = this.getString(index);
	if(typeof str == 'undefined') return false;
	return JSON.parse(str);
};

localStorageList.prototype.set = function (index,obj) {
	return this.setString(index,JSON.stringify(obj));
};

localStorageList.prototype.remove = function (index) {
	itemCount = this.count();
	if(index < 0 || itemCount <= index) return false;
	for(var i = parseInt(index) + 1; i < itemCount; i++) {
		localStorage[this.prefix+(i-1)] = localStorage[this.prefix+i];
	}
	itemCount--;
	delete localStorage[this.prefix+itemCount];
	localStorage[this.prefix+'itemcount'] = itemCount;
};

localStorageList.prototype.clear = function () {
	itemCount = this.count();
	for(var i = 0; i < itemCount; i++) {
		delete localStorage[this.prefix+i];
	}

	delete localStorage[this.prefix+'itemcount'];
};
