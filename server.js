require.paths.unshift(__dirname + '/vendor/express/lib');
require.paths.unshift(__dirname + '/vendor/express/support/connect/lib');
require.paths.unshift(__dirname);

var ShortUrl = require('lib/tinyurl').ShortUrl;
var sys = require('sys');
var mongo = require('vendor/node-mongodb-native/lib/mongodb');
var db = new mongo.Db('tinyurl', new mongo.Server('127.0.0.1', 27017, {}), {});
db.addListener("error", function(error) {
  sys.puts("Error connecting to mongo -- perhaps it isn't running?");
});
var connect = require('connect');
var server = require('express').createServer();
server.use(connect.bodyDecoder());

db.open(function(p_db) {
	db.createCollection('urls', function(err, collection) {
		if(err) throw err;
		collection.ensureIndex([['url', 1]], true, function(err) {
			if (err) throw err;
		});
		collection.ensureIndex([['index', 1]], true, function(err) {
			if (err) throw err;
		});
		server.set('collection', collection);
	});
});


server.get('/test', function(req, res) {
	res.send('<form action="/" method="post"><input type="text" name="url" /><input type="submit" value="Create" /></form>');
});

server.get('/:key', function(req, res) {
	var key = req.param('key');
	var index = ShortUrl.getIndex(key);
	sys.log('Searching for url with key ' + key + ', index ' + index);
	var collection = server.set('collection');
	collection.findOne({index: index}, function(err, result) {
		if (err) throw err;
		if (undefined == result) {
			sys.log('Cound not match ' + key);
			return;
		}
		collection.update({_id: result._id}, {'$inc': {hits: 1}}, {}, function(err) {
			if (err) throw err;
		});
		sys.log('Redirecting to ' + result.url);
		res.send('', {'Location': result.url}, 301);
	});
});

server.post('/', function(req, res) {
	var url = req.param('url');
	sys.log('Received ' + url);
	var data = {url: url};
	var collection = server.set('collection');
	collection.findOne({url: url}, function(err, result) {
		if(err) throw err;
		if (typeof result !== "undefined" && null !== result) {
			sys.log('Result of url search is ' + result);
			data.index = result.index;
			sys.log('Creating ShortUrl for ' + data.url + ' at index ' + data.index);
			return returnResponse(data);
		}
		collection.find({index: {'$exists': true}}, {sort: [[ 'index', 'desc' ]], limit: 1, fields: {index: true}}, function(err, cursor) {
			if (err) throw err;
			cursor.nextObject(function(err, result) {
				if (err) throw err;
				if (null !== result) {
					sys.log('The maximum index for url ' + url + ' is ' + JSON.stringify(result));
				}
				data.index = (null == result) ? 0 : result.index + 1;
				collection.insert(data, function (err) {
					if (err) sys.log(err.getMessage());
				});
				sys.log('Creating ShortUrl for ' + data.url + ' at index ' + data.index);
				returnResponse(data);
			});
		});
	});
	function returnResponse(data) {
		tinyurl = new ShortUrl(data.url, data.index);
		sys.log('The key for url index ' + data.index + ' is ' + tinyurl.getKey());
		res.send('{ key: "' + tinyurl.getKey() + '" }', {'Content-Type': 'text/javascript'}, 200);
	}
});

server.listen(8000);