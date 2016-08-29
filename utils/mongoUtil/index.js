'use strict';

const config = require('../../config');
const MongoClient = require('mongodb').MongoClient;

var _db = null;

module.exports = {
    connectToServer: function(callback) {
        MongoClient.connect(config.dbaddress, function(err, db) {
            if(err) {
                console.log("Connection couldn't be established.");
                return callback(err, null);
            }
            else {
                console.log("Connected successfully to server");
                _db = db;
                callback(null, _db);
            }
	    });
    },
    getDb: function() {
        return _db;
    }
}