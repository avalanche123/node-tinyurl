function ShortUrl(url, index) {
	this.url = url;
	this.index = (typeof index == "string") ? parseInt(index) : index;
}
// todo: write a base 36 conversion function
ShortUrl.prototype.getKey = function() {
	return this.index.toString(36);
};

ShortUrl.getIndex = function(key) {
	return parseInt(key, 36);
};

exports.ShortUrl = ShortUrl;